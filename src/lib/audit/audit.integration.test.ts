import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getDb } from "@/db";

vi.mock("server-only", () => ({}));
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
