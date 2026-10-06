import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getDb } from "@/db";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (request.token ? { value: request.token } : undefined),
  }),
}));
const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error("TEST_DATABASE_URL é obrigatória.");
const url = new URL(value);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/guardian_bay_test" ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === url.pathname)
)
  throw new Error("Banco local dedicado obrigatório.");
const client = postgres(value, { max: 4, onnotice: () => {} });
const actor = randomUUID();
const anonymousIds: string[] = [];
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
});
afterAll(async () => {
  await client`DELETE FROM audit_events WHERE actor_user_id=${actor} OR id=ANY(${anonymousIds}::uuid[])`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
it("ECMSG-106: defaults, UUIDs históricos sem FK, allowlists e nulidade coerente", async () => {
  const [event] =
    await client`INSERT INTO audit_events(event_type,outcome,actor_user_id,target_type,target_id,correlation_id) VALUES ('auth.login.succeeded','SUCCESS',${actor},'user',${actor},${randomUUID()}) RETURNING *`;
  expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(Number.isFinite(new Date(event.occurred_at).getTime())).toBe(true);
  expect(Object.keys(event).sort()).toEqual([
    "actor_user_id",
    "correlation_id",
    "event_type",
    "id",
    "occurred_at",
    "outcome",
    "target_id",
    "target_type",
  ]);
  for (const type of ["free.event", "auth.login.succeeded"]) {
    await expect(
      client`INSERT INTO audit_events(event_type,outcome,correlation_id) VALUES (${type},'SUCCESS',${randomUUID()})`,
    ).rejects.toMatchObject({ code: "23514" });
  }
  await expect(
    client`INSERT INTO audit_events(event_type,outcome,actor_user_id,target_type,target_id,correlation_id) VALUES ('order.completed','THRESHOLD_REACHED',${actor},'order',${randomUUID()},${randomUUID()})`,
  ).rejects.toMatchObject({ code: "23514" });
  const [threshold] =
    await client`INSERT INTO audit_events(event_type,outcome,correlation_id) VALUES ('auth.abuse.threshold_reached','THRESHOLD_REACHED',${randomUUID()}) RETURNING id`;
  anonymousIds.push(threshold.id);
  await expect(
    client`INSERT INTO audit_events(event_type,outcome,correlation_id) VALUES ('auth.abuse.threshold_reached','THRESHOLD_REACHED','not-a-uuid')`,
  ).rejects.toMatchObject({ code: "22P02" });
});

it("ECMSG-107: writer usa transação do chamador e rollback não deixa evento", async () => {
  const { writeAuditEvent } = await import("./server");
  const before = (
    await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${actor}`
  )[0].count;
  await expect(
    getDb().transaction(async (tx) => {
      await writeAuditEvent(tx, {
        eventType: "order.completed",
        outcome: "SUCCESS",
        actorUserId: actor,
        targetType: "order",
        targetId: randomUUID(),
      });
      throw new Error("Synthetic rollback");
    }),
  ).rejects.toThrow("Synthetic rollback");
  expect(
    (
      await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${actor}`
    )[0].count,
  ).toBe(before);
  await getDb().transaction((tx) =>
    writeAuditEvent(tx, {
      eventType: "order.completed",
      outcome: "FAILED",
      actorUserId: actor,
      targetType: "order",
      targetId: randomUUID(),
    }),
  );
  expect(
    (
      await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${actor}`
    )[0].count,
  ).toBe(before + 1);
});

it("ECMSG-108: login auditado somente após sessão criada; falha do audit faz rollback", async () => {
  const { createSession } = await import("@/features/auth/server/session");
  const writer = await import("./server");
  const { hashPassword } = await import("@/features/auth/server/password");
  const credentialHash = await hashPassword("Audit integration passphrase");
  const [user] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@audit.example.test`},${credentialHash}) RETURNING id`;
  try {
    await createSession(user.id, undefined, credentialHash);
    expect(
      (
        await client`SELECT event_type FROM audit_events WHERE actor_user_id=${user.id}`
      ).map((row) => row.event_type),
    ).toEqual(["auth.login.succeeded"]);
    const count = (
      await client`SELECT count(*)::int AS count FROM sessions WHERE user_id=${user.id}`
    )[0].count;
    const spy = vi
      .spyOn(writer, "writeAuditEvent")
      .mockRejectedValueOnce(new Error("Synthetic sink failure"));
    try {
      await expect(
        createSession(user.id, undefined, credentialHash),
      ).rejects.toThrow("Não foi possível processar a sessão.");
    } finally {
      spy.mockRestore();
    }
    expect(
      (
        await client`SELECT count(*)::int AS count FROM sessions WHERE user_id=${user.id}`
      )[0].count,
    ).toBe(count);
    await expect(
      createSession(user.id, undefined, "stale-hash"),
    ).rejects.toThrow();
    expect(
      (
        await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${user.id}`
      )[0].count,
    ).toBe(1);
  } finally {
    await client`DELETE FROM audit_events WHERE actor_user_id=${user.id}`;
    await client`DELETE FROM users WHERE id=${user.id}`;
  }
});

it("ECMSG-112: limiar único, sem evento por bloqueio; falha do audit não devolve capacidade", async () => {
  const { createHash } = await import("node:crypto");
  const { reserveLoginAttempt } = await import(
    "@/features/auth/server/login-rate-limit"
  );
  const writer = await import("./server");
  const email = `${randomUUID()}@threshold.example.test`;
  const key = `email:${createHash("sha256").update(email).digest("hex")}`;
  const started = new Date().toISOString();
  await client`DELETE FROM login_rate_limits WHERE key='global' OR key=${key}`;
  try {
    for (let i = 0; i < 5; i++)
      expect(await reserveLoginAttempt(email)).toBe(true);
    for (let i = 0; i < 3; i++)
      expect(await reserveLoginAttempt(email)).toBe(false);
    const events =
      await client`SELECT id FROM audit_events WHERE event_type='auth.abuse.threshold_reached' AND occurred_at>=${started}`;
    expect(events).toHaveLength(1);
    anonymousIds.push(...events.map((row) => row.id));
    await client`DELETE FROM login_rate_limits WHERE key='global' OR key=${key}`;
    for (let i = 0; i < 4; i++) await reserveLoginAttempt(email);
    const spy = vi
      .spyOn(writer, "writeAuditEvent")
      .mockRejectedValueOnce(new Error("Synthetic sink failure"));
    try {
      expect(await reserveLoginAttempt(email)).toBe(true);
    } finally {
      spy.mockRestore();
    }
    expect(await reserveLoginAttempt(email)).toBe(false);
    expect(
      (await client`SELECT attempts FROM login_rate_limits WHERE key=${key}`)[0]
        .attempts,
    ).toBe(5);
  } finally {
    await client`DELETE FROM login_rate_limits WHERE key='global' OR key=${key}`;
  }
});

it("ECMSG-114: leitura própria exige admin atual, filtros limitados e DTO mínimo", async () => {
  const { readAudit } = await import("@/features/audit/server/read-audit");
  const { createSession } = await import("@/features/auth/server/session");
  const { hashPassword } = await import("@/features/auth/server/password");
  request.token = undefined;
  expect(await readAudit()).toMatchObject({
    success: false,
    code: "UNAUTHENTICATED",
  });
  const hash = await hashPassword("Audit admin integration passphrase");
  const [user] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@audit.example.test`},${hash}) RETURNING id`;
  try {
    request.token = (await createSession(user.id)).token;
    expect(await readAudit()).toMatchObject({ code: "FORBIDDEN" });
    await client`UPDATE users SET role='admin' WHERE id=${user.id}`;
    const result = await readAudit({
      actorUserId: actor,
      limit: "1",
      sort: "oldest",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected audit read");
    expect(result.events).toHaveLength(1);
    expect(result.hasNext).toBe(true);
    expect(Object.keys(result.events[0]).sort()).toEqual([
      "actorUserId",
      "eventId",
      "eventType",
      "occurredAt",
      "outcome",
      "targetId",
      "targetType",
    ]);
    for (const input of [
      { page: "1001" },
      { limit: "51" },
      { sort: "SQL DESC" },
      { actorUserId: "' OR 1=1 --" },
      { metadata: "free" },
      { eventType: "free.event" },
    ])
      expect(await readAudit(input)).toMatchObject({ code: "INVALID_INPUT" });
    await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
    expect(await readAudit()).toMatchObject({ code: "FORBIDDEN" });
  } finally {
    request.token = undefined;
    await client`DELETE FROM users WHERE id=${user.id}`;
  }
});

it("ECMSG-115: contrato inválido/consulta rejeitada não causa flood nem persiste segredo", async () => {
  const { writeAuditEvent } = await import("./server");
  const { readAudit } = await import("@/features/audit/server/read-audit");
  const before = (
    await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${actor}`
  )[0].count;
  const forged = {
    eventType: "auth.login.succeeded",
    outcome: "SUCCESS",
    actorUserId: actor,
    targetType: "user",
    targetId: actor,
    payload: "synthetic-forbidden-data",
  };
  for (let i = 0; i < 5; i++) {
    await expect(
      getDb().transaction((tx) =>
        writeAuditEvent(tx, forged as Parameters<typeof writeAuditEvent>[1]),
      ),
    ).rejects.toThrow(/^Evento de auditoria inválido\.$/);
    expect(await readAudit({ eventType: "client.free" })).toMatchObject({
      code: "INVALID_INPUT",
    });
  }
  expect(
    (
      await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${actor}`
    )[0].count,
  ).toBe(before);
  const cols =
    await client`SELECT column_name FROM information_schema.columns WHERE table_name='audit_events' AND table_schema='public'`;
  expect(cols.map((row) => row.column_name)).not.toContain("payload");
});

it("ECMSG-116: retenção manual limitada remove antigo e preserva recente", async () => {
  const oldTarget = randomUUID();
  const freshTarget = randomUUID();
  await client`INSERT INTO audit_events(event_type,outcome,actor_user_id,target_type,target_id,correlation_id,occurred_at) VALUES ('order.completed','SUCCESS',${actor},'order',${oldTarget},${randomUUID()},clock_timestamp()-interval '91 days'),('order.completed','SUCCESS',${actor},'order',${freshTarget},${randomUUID()},clock_timestamp())`;
  await client`DELETE FROM audit_events WHERE id IN (SELECT id FROM audit_events WHERE actor_user_id=${actor} AND occurred_at<CURRENT_TIMESTAMP-interval '90 days' ORDER BY occurred_at,id LIMIT 1000)`;
  expect(
    await client`SELECT id FROM audit_events WHERE target_id=${oldTarget}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT id FROM audit_events WHERE target_id=${freshTarget}`,
  ).toHaveLength(1);
});
