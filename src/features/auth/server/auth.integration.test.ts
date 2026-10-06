import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { loginAction } from "../actions/login.action";
import { logoutAction } from "../actions/logout.action";
import { authenticate } from "./authenticate";
import { hashPassword, verifyPassword } from "./password";
import { createSession, resolveSession, revokeSession } from "./session";
import {
  getAuthenticatedIdentity,
  sessionCookiePolicy,
} from "./session-cookie";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  headers: new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  }),
  token: undefined as string | undefined,
  lastCookie: undefined as
    | { name: string; value: string; options: Record<string, unknown> }
    | undefined,
}));
// Only request context is simulated; queries, transactions and Argon2 are real.
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => (request.token ? { value: request.token } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      request.lastCookie = { name, value, options };
      request.token = value || undefined;
    },
  }),
}));

// No fallback to DATABASE_URL, no destructive reset, only dedicated local DB.
const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error("TEST_DATABASE_URL é obrigatória para integração.");
const url = new URL(value);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/guardian_bay_test" ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === url.pathname)
)
  throw new Error("Integração exige banco local dedicado guardian_bay_test.");

const client = postgres(value, { max: 1, onnotice: () => {} });
const database = drizzle(client);
const email = `${randomUUID()}@example.test`;
const password = "Integration passphrase 24";
let passwordHash: string;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(database, { migrationsFolder: "drizzle" });
  passwordHash = await hashPassword(password);
});

afterAll(async () => {
  await client`DELETE FROM users WHERE email = ${email}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

describe("ECMSG-23: persistência PostgreSQL real", () => {
  it("gera UUID/timestamp e verifica credencial após INSERT/SELECT", async () => {
    const [row] = await database
      .insert(users)
      .values({ email, passwordHash })
      .returning();
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.createdAt).toBeInstanceOf(Date);
    const [stored] = await client`SELECT * FROM users WHERE id = ${row.id}`;
    expect(stored.password_hash).toBe(passwordHash);
    expect(Object.values(stored)).not.toContain(password);
    expect(await verifyPassword(password, stored.password_hash)).toBe(true);
    expect(
      await verifyPassword("Incorrect passphrase", stored.password_hash),
    ).toBe(false);
  });

  it("rejeita identidade duplicada", async () => {
    await expect(
      database.insert(users).values({ email, passwordHash }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
  });

  it.each([
    "UPPER@example.test",
    " spaced@example.test",
    "a b@example.test",
    "á@example.test",
    "missing-at",
    "a@@example.test",
  ])("rejeita e-mail não canônico %s", async (invalidEmail) => {
    await expect(
      client`INSERT INTO users(email,password_hash) VALUES (${invalidEmail},${passwordHash})`,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it.each([
    "plaintext",
    "$argon2id$invalid",
    "",
  ])("rejeita hash inválido", async (invalidHash) => {
    await expect(
      client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@example.test`},${invalidHash})`,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("garante NOT NULL no banco", async () => {
    await expect(
      client`INSERT INTO users(email,password_hash) VALUES (NULL,${passwordHash})`,
    ).rejects.toMatchObject({ code: "23502" });
    await expect(
      client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@example.test`},NULL)`,
    ).rejects.toMatchObject({ code: "23502" });
    await expect(
      client`INSERT INTO users(email,password_hash,created_at) VALUES (${`${randomUUID()}@example.test`},${passwordHash},NULL)`,
    ).rejects.toMatchObject({ code: "23502" });
  });
});

describe("autenticação e sessões com PostgreSQL real", () => {
  let userId: string;
  let token: string;
  it("normaliza e-mail e autentica apenas a senha correta", async () => {
    userId = (await authenticate({
      email: ` ${email.toUpperCase()} `,
      password,
    })) as string;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      await authenticate({ email, password: "Wrong password value" }),
    ).toBeNull();
    expect(
      await authenticate({ email: "absent@example.test", password }),
    ).toBeNull();
  });
  it("falhas públicas são equivalentes, sem hash/senha", async () => {
    const wrong = await loginAction({
      email,
      password: "Wrong password value",
    });
    expect(wrong).toEqual(
      await loginAction({ email: "absent@example.test", password }),
    );
    expect(wrong).toEqual(
      await loginAction({ email, password, role: "admin" }),
    );
    expect(wrong).toEqual({
      success: false,
      message: "Credenciais inválidas.",
    });
    expect(request.token).toBeUndefined();
  });
  it("observa custo real das duas falhas e autenticação concorrente", async () => {
    const durations: number[][] = [[], []];
    for (let sample = 0; sample < 5; sample++) {
      for (const [index, loginEmail] of [
        email,
        "absent@example.test",
      ].entries()) {
        const start = performance.now();
        expect(
          await authenticate({
            email: loginEmail,
            password: "Wrong password value",
          }),
        ).toBeNull();
        durations[index].push(performance.now() - start);
      }
    }
    const medians = durations.map((samples) =>
      Math.round(samples.sort((a, b) => a - b)[2]),
    );
    console.info(
      `Argon2 real: medianas senha incorreta/inexistente ${medians.join("/")} ms; política 64 MiB por verificação.`,
    );
    expect(
      await Promise.all([
        authenticate({ email, password }),
        authenticate({ email, password }),
      ]),
    ).toEqual([userId, userId]);
  });
  it("falha operacional não expõe input, SQL ou cause", async () => {
    try {
      await createSession("invalid-user-id");
      expect.fail("deveria rejeitar UUID inválido");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "Não foi possível processar a sessão.",
      );
      expect((error as Error).cause).toBeUndefined();
      expect((error as Error).stack).not.toContain("invalid-user-id");
    }
  });
  it("login cria sessão e entrega token exclusivamente ao cookie HttpOnly", async () => {
    expect(await loginAction({ email, password })).toEqual({ success: true });
    token = request.token as string;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const [stored] =
      await client`SELECT * FROM sessions WHERE user_id = ${userId}`;
    expect(stored.token_hash).not.toBe(token);
    expect(Object.values(stored)).not.toContain(token);
    expect(
      new Date(stored.expires_at).getTime() -
        new Date(stored.created_at).getTime(),
    ).toBe(8 * 60 * 60 * 1000);
    expect(request.lastCookie?.options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    expect(await getAuthenticatedIdentity()).toEqual({ id: userId, email });
  });
  it("login rotaciona token, revoga anterior e não expõe sessão no retorno", async () => {
    expect(await loginAction({ email, password })).toEqual({ success: true });
    expect(request.token).not.toBe(token);
    expect(await resolveSession(token)).toBeNull();
    token = request.token as string;
    expect(await resolveSession(token)).toEqual({ id: userId, email });
  });
  it.each([
    undefined,
    "invalid",
    "a".repeat(64),
    "b".repeat(65),
  ])("rejeita token ausente/inválido/inexistente", async (invalid) => {
    expect(await resolveSession(invalid)).toBeNull();
  });
  it("sessão expirada não autentica", async () => {
    const session = await createSession(userId);
    await client`UPDATE sessions SET created_at = CURRENT_TIMESTAMP - interval '2 days', expires_at = CURRENT_TIMESTAMP - interval '1 day' WHERE user_id = ${userId}`;
    expect(await resolveSession(session.token)).toBeNull();
    expect(await resolveSession(token)).toBeNull();
  });
  it("logout revoga no banco antes de expirar cookie e é idempotente", async () => {
    await loginAction({ email, password });
    token = request.token as string;
    expect(await logoutAction()).toEqual({ success: true });
    expect(await resolveSession(token)).toBeNull();
    expect(request.lastCookie).toMatchObject({
      value: "",
      options: { maxAge: 0, expires: new Date(0), httpOnly: true },
    });
    await logoutAction();
    await revokeSession(token);
  });
  it("logins concorrentes usam tokens distintos; logout concorrente é consistente", async () => {
    const [a, b] = await Promise.all([
      createSession(userId),
      createSession(userId),
    ]);
    expect(a.token).not.toBe(b.token);
    await Promise.all([revokeSession(a.token), revokeSession(a.token)]);
    expect(await resolveSession(a.token)).toBeNull();
    expect(await resolveSession(b.token)).toEqual({ id: userId, email });
  });
  it("constraints garantem PK/formato/FK/NOT NULL/expiração e cascade", async () => {
    const hash = "c".repeat(64);
    await client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${hash},${userId},CURRENT_TIMESTAMP + interval '1 hour')`;
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${hash},${userId},CURRENT_TIMESTAMP + interval '1 hour')`,
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${"d".repeat(64)},${randomUUID()},CURRENT_TIMESTAMP + interval '1 hour')`,
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ('bad',${userId},CURRENT_TIMESTAMP + interval '1 hour')`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${"e".repeat(64)},${userId},CURRENT_TIMESTAMP)`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${"f".repeat(64)},${userId},NULL)`,
    ).rejects.toMatchObject({ code: "23502" });
    await expect(
      client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${"f".repeat(64)},NULL,CURRENT_TIMESTAMP + interval '1 hour')`,
    ).rejects.toMatchObject({ code: "23502" });
    await client`DELETE FROM users WHERE id = ${userId}`;
    expect(
      await client`SELECT * FROM sessions WHERE user_id = ${userId}`,
    ).toHaveLength(0);
    expect(await resolveSession(token)).toBeNull();
  });
  it.each([
    null,
    "null",
    "https://evil.test",
    "http://localhost:4000",
  ])("rejeita Origin inválida antes de autenticar", async (origin) => {
    request.headers = new Headers({
      host: "localhost:3000",
      ...(origin ? { origin } : {}),
    });
    await expect(loginAction({ email, password })).rejects.toThrow(
      "Requisição inválida.",
    );
    await expect(logoutAction()).rejects.toThrow("Requisição inválida.");
  });
  it("cookie de produção é Secure, HttpOnly e __Host", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookiePolicy()).toEqual({
      name: "__Host-guardian-session",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    vi.stubEnv("NODE_ENV", "test");
  });
});
