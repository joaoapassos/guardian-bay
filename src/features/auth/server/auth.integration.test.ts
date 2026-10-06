import { createHash, randomUUID } from "node:crypto";
import { argon2id, hash } from "argon2";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as databaseInfrastructure from "@/db";
import { getDb } from "@/db";
import { loginRateLimits } from "@/db/schema/login-rate-limits";
import { users } from "@/db/schema/users";
import { changePasswordAction } from "../actions/change-password.action";
import { loginAction } from "../actions/login.action";
import { logoutAction } from "../actions/logout.action";
import { readIdentityAction } from "../actions/read-identity.action";
import { registerAction } from "../actions/register.action";
import { authenticate } from "./authenticate";
import { login } from "./login";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import * as passwordOperations from "./password";
import { hashPassword, verifyPassword } from "./password";
import { readAccount } from "./read-account";
import { readOwnIdentity } from "./read-own-identity";
import {
  createSession,
  recordSessionActivity,
  resolveSession,
  revokeSession,
  tokenHash,
} from "./session";
import * as sessionCookie from "./session-cookie";
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
const unknownEmail = `${randomUUID()}@example.test`;
const password = "Integration passphrase 24";
let passwordHash: string;
const rateKeys = new Set(["global"]);
function fixtureRateKey(fixtureEmail: string, prefix = "email") {
  const key = `${prefix}:${createHash("sha256").update(fixtureEmail.trim().toLowerCase()).digest("hex")}`;
  rateKeys.add(key);
  return key;
}
fixtureRateKey(email);
fixtureRateKey(unknownEmail);

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(database, { migrationsFolder: "drizzle" });
  passwordHash = await hashPassword(password);
});

beforeEach(async () => {
  // Only this suite's fixture keys and its dedicated global budget are reset.
  await database
    .delete(loginRateLimits)
    .where(inArray(loginRateLimits.key, [...rateKeys]));
});

afterAll(async () => {
  await client`DELETE FROM users WHERE email = ${email}`;
  await database
    .delete(loginRateLimits)
    .where(inArray(loginRateLimits.key, [...rateKeys]));
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
    userId = (
      await authenticate({
        email: ` ${email.toUpperCase()} `,
        password,
      })
    )?.id as string;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      await authenticate({ email, password: "Wrong password value" }),
    ).toBeNull();
    expect(await authenticate({ email: unknownEmail, password })).toBeNull();
  });
  it("falhas públicas são equivalentes, sem hash/senha", async () => {
    const wrong = await loginAction({
      email,
      password: "Wrong password value",
    });
    expect(wrong).toEqual(await loginAction({ email: unknownEmail, password }));
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
      for (const [index, loginEmail] of [email, unknownEmail].entries()) {
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
      (
        await Promise.all([
          authenticate({ email, password }),
          authenticate({ email, password }),
        ])
      ).map((identity) => identity?.id),
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
    await client`UPDATE sessions SET created_at = CURRENT_TIMESTAMP - interval '2 days', last_active_at = CURRENT_TIMESTAMP - interval '2 days', expires_at = CURRENT_TIMESTAMP - interval '1 day' WHERE user_id = ${userId}`;
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

describe("ECMSG-25: autorização e correções de autenticação", () => {
  const emails = [randomUUID(), randomUUID(), randomUUID()].map(
    (id) => `${id}@example.test`,
  );
  let ids: string[];
  let ownToken: string;
  beforeAll(async () => {
    emails.forEach((email) => {
      fixtureRateKey(email);
    });
    const legacyHash = await hash("old", {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });
    const rows = await database
      .insert(users)
      .values(
        emails.map((fixtureEmail, index) => ({
          email: fixtureEmail,
          passwordHash: index === 2 ? legacyHash : passwordHash,
        })),
      )
      .returning({ id: users.id });
    ids = rows.map((row) => row.id);
  });
  beforeEach(async () => {
    request.headers = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    ownToken = (await createSession(ids[0])).token;
    request.token = ownToken;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await client`DELETE FROM sessions WHERE user_id IN (${ids[0]},${ids[1]},${ids[2]})`;
  });
  afterAll(async () => {
    await client`DELETE FROM users WHERE email IN (${emails[0]},${emails[1]},${emails[2]})`;
  });
  it("login verifica credencial existente menor que o mínimo de criação", async () => {
    expect(await loginAction({ email: emails[2], password: "old" })).toEqual({
      success: true,
    });
    expect(await sessionCookie.getAuthenticatedIdentity()).toEqual({
      id: ids[2],
      email: emails[2],
    });
  });
  it.each([
    undefined,
    "invalid",
    "a".repeat(64),
  ])("identidade obrigatória rejeita sessão ausente/inválida", async (token) => {
    request.token = token;
    expect(await sessionCookie.requireAuthenticatedIdentity()).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
  it("A lê A com DTO mínimo; A troca apenas ID para B e continua negado", async () => {
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: true,
      identity: { id: ids[0], email: emails[0] },
    });
    expect(await readOwnIdentity({ userId: ids[1] })).toEqual({
      success: false,
      code: "FORBIDDEN",
    });
    expect(await readIdentityAction({ userId: ids[1] })).toEqual({
      success: false,
      code: "NOT_FOUND",
    });
    expect(await readIdentityAction({ userId: randomUUID() })).toEqual({
      success: false,
      code: "NOT_FOUND",
    });
    request.token = (await createSession(ids[1])).token;
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: false,
      code: "NOT_FOUND",
    });
  });
  it("chamada direta sem UI não aceita role/userId como autoridade", async () => {
    expect(await readOwnIdentity({ userId: ids[1], role: "admin" })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(
      await readIdentityAction({ userId: ids[1], authenticatedUserId: ids[1] }),
    ).toEqual({ success: false, code: "INVALID_INPUT" });
    expect(await readIdentityAction({ userId: "' OR TRUE --" })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
  });
  it("sessão revogada não autoriza", async () => {
    await revokeSession(ownToken);
    expect(await readOwnIdentity({ userId: ids[0] })).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
  it("revogação entre helper e query final impede disclosure", async () => {
    const original = sessionCookie.requireAuthenticatedIdentity;
    vi.spyOn(
      sessionCookie,
      "requireAuthenticatedIdentity",
    ).mockImplementationOnce(async () => {
      const result = await original();
      await revokeSession(ownToken);
      return result;
    });
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: false,
      code: "NOT_FOUND",
    });
  });
  it("idle timeout rejeita sessão após 30 minutos e não ressuscita", async () => {
    await client`UPDATE sessions SET created_at=CURRENT_TIMESTAMP-interval '1 hour', last_active_at=CURRENT_TIMESTAMP-interval '31 minutes' WHERE token_hash=${tokenHash(ownToken)}`;
    expect(await resolveSession(ownToken)).toBeNull();
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    await recordSessionActivity(ownToken);
    expect(await resolveSession(ownToken)).toBeNull();
  });
  it("renova atividade no máximo a cada 5 minutos sem estender limite absoluto", async () => {
    await client`UPDATE sessions SET created_at=CURRENT_TIMESTAMP-interval '1 hour', last_active_at=CURRENT_TIMESTAMP-interval '6 minutes' WHERE token_hash=${tokenHash(ownToken)}`;
    const [before] =
      await client`SELECT last_active_at,expires_at FROM sessions WHERE token_hash=${tokenHash(ownToken)}`;
    await Promise.all([
      readIdentityAction({ userId: ids[0] }),
      readIdentityAction({ userId: ids[0] }),
    ]);
    const [after] =
      await client`SELECT last_active_at,expires_at FROM sessions WHERE token_hash=${tokenHash(ownToken)}`;
    expect(after.last_active_at).not.toEqual(before.last_active_at);
    expect(after.expires_at).toEqual(before.expires_at);
    await readIdentityAction({ userId: ids[0] });
    const [again] =
      await client`SELECT last_active_at FROM sessions WHERE token_hash=${tokenHash(ownToken)}`;
    expect(again.last_active_at).toEqual(after.last_active_at);
  });
  it("render/leitura server não renova atividade", async () => {
    await client`UPDATE sessions SET created_at=CURRENT_TIMESTAMP-interval '1 hour', last_active_at=CURRENT_TIMESTAMP-interval '6 minutes' WHERE token_hash=${tokenHash(ownToken)}`;
    const [before] =
      await client`SELECT last_active_at FROM sessions WHERE token_hash=${tokenHash(ownToken)}`;
    await sessionCookie.getAuthenticatedIdentity();
    const [after] =
      await client`SELECT last_active_at FROM sessions WHERE token_hash=${tokenHash(ownToken)}`;
    expect(after.last_active_at).toEqual(before.last_active_at);
  });
  it("expiração absoluta continua negando autorização", async () => {
    await client`UPDATE sessions SET created_at=CURRENT_TIMESTAMP-interval '9 hours', last_active_at=CURRENT_TIMESTAMP-interval '2 hours', expires_at=CURRENT_TIMESTAMP-interval '1 hour' WHERE token_hash=${tokenHash(ownToken)}`;
    expect(await sessionCookie.requireAuthenticatedIdentity()).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    expect(await readIdentityAction({ userId: ids[0] })).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
  it("constraint de atividade rejeita NULL e atividade anterior à criação", async () => {
    await expect(
      client`UPDATE sessions SET last_active_at=NULL WHERE token_hash=${tokenHash(ownToken)}`,
    ).rejects.toMatchObject({ code: "23502" });
    await expect(
      client`UPDATE sessions SET last_active_at=created_at-interval '1 second' WHERE token_hash=${tokenHash(ownToken)}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("proxy com Host público é aceito; forwarded-host forjado não concede origem", async () => {
    request.headers = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "x-forwarded-host": "localhost:3000",
    });
    expect((await readIdentityAction({ userId: ids[0] })).success).toBe(true);
    request.headers = new Headers({
      origin: "https://public.example.test",
      host: "backend:3000",
      "x-forwarded-host": "public.example.test",
    });
    await expect(readIdentityAction({ userId: ids[0] })).rejects.toThrow(
      "Requisição inválida.",
    );
    request.headers = new Headers({
      origin: "https://evil.test",
      host: "localhost:3000",
      "x-forwarded-host": "evil.test",
    });
    await expect(readIdentityAction({ userId: ids[0] })).rejects.toThrow(
      "Requisição inválida.",
    );
  });
});

describe("ECMSG-26: requests, abuso e concorrência real", () => {
  const emails = [randomUUID(), randomUUID()].map((id) => `${id}@example.test`);
  const keys = emails.map((email) => fixtureRateKey(email));
  let userId: string;
  beforeAll(async () => {
    const [user] = await database
      .insert(users)
      .values({ email: emails[0], passwordHash })
      .returning({ id: users.id });
    userId = user.id;
  });
  beforeEach(() => {
    request.headers = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    request.token = undefined;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NODE_ENV", "test");
  });
  afterAll(async () => {
    await client`DELETE FROM users WHERE id=${userId}`;
  });

  it("input inválido e argumentos extras não chegam a DB/Argon2/cookies", async () => {
    const dbSpy = vi.spyOn(databaseInfrastructure, "getDb");
    const passwordSpy = vi.spyOn(passwordOperations, "verifyPassword");
    const inputs = [
      undefined,
      null,
      "invalid",
      { email: emails[0], password, role: "admin" },
      { email: "x".repeat(321), password },
      { email: emails[0], password: "x".repeat(100000) },
      { email: emails[0], password, sessionToken: "forged" },
    ];
    for (const input of inputs)
      expect(await login(input)).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    expect(
      await loginAction({ email: emails[0], password }, { role: "admin" }),
    ).toEqual({ success: false, message: "Credenciais inválidas." });
    expect(
      await readIdentityAction({ userId: userId, permissions: ["all"] }),
    ).toEqual({ success: false, code: "INVALID_INPUT" });
    expect(await readIdentityAction({ userId }, "extra")).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(await logoutAction({ token: "forged" })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(dbSpy).not.toHaveBeenCalled();
    expect(passwordSpy).not.toHaveBeenCalled();
  });
  it("cinco tentativas são admitidas, sexta é bloqueada antes do Argon2", async () => {
    const passwordSpy = vi.spyOn(passwordOperations, "verifyPassword");
    for (let attempt = 0; attempt < 5; attempt++)
      expect(
        await loginAction({ email: emails[0], password: "incorrect" }),
      ).toEqual({ success: false, message: "Credenciais inválidas." });
    const [before] =
      await client`SELECT expires_at FROM login_rate_limits WHERE key=${keys[0]}`;
    expect(
      await loginAction({ email: ` ${emails[0].toUpperCase()} `, password }),
    ).toEqual({
      success: false,
      code: "RATE_LIMITED",
      message: "Não foi possível autenticar agora. Tente novamente mais tarde.",
    });
    const [after] =
      await client`SELECT expires_at,attempts FROM login_rate_limits WHERE key=${keys[0]}`;
    expect(after.expires_at).toEqual(before.expires_at);
    expect(after.attempts).toBe(5);
    expect(passwordSpy).toHaveBeenCalledTimes(5);
  });
  it("limite e respostas não distinguem identidade existente/inexistente", async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      expect(
        await loginAction({ email: emails[0], password: "incorrect" }),
      ).toEqual(await loginAction({ email: emails[1], password: "incorrect" }));
    }
    const data =
      await client`SELECT * FROM login_rate_limits WHERE key IN (${keys[0]},${keys[1]})`;
    expect(data).toHaveLength(2);
    for (const row of data) expect(Object.values(row)).not.toContain(emails[0]);
  });
  it("e-mails independentes compartilham somente o orçamento global", async () => {
    for (let attempt = 0; attempt < 5; attempt++)
      expect(await reserveLoginAttempt(emails[0])).toBe(true);
    expect(await reserveLoginAttempt(emails[0])).toBe(false);
    expect(await reserveLoginAttempt(emails[1])).toBe(true);
  });
  it("janela expirada reabre sem bloqueio permanente", async () => {
    for (let attempt = 0; attempt < 5; attempt++)
      await reserveLoginAttempt(emails[0]);
    await client`UPDATE login_rate_limits SET started_at=CURRENT_TIMESTAMP-interval '16 minutes',expires_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE key=${keys[0]}`;
    expect(await reserveLoginAttempt(emails[0])).toBe(true);
    const [row] =
      await client`SELECT attempts,expires_at>CURRENT_TIMESTAMP AS active FROM login_rate_limits WHERE key=${keys[0]}`;
    expect(row).toMatchObject({ attempts: 1, active: true });
  });
  it("reserva concorrente não ultrapassa cinco por e-mail nem vinte globais", async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => reserveLoginAttempt(emails[0])),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
    const rows =
      await client`SELECT key,attempts FROM login_rate_limits WHERE key IN ('global',${keys[0]})`;
    expect(rows.find((row) => row.key === keys[0])?.attempts).toBe(5);
    expect(rows.find((row) => row.key === "global")?.attempts).toBe(20);
  });
  it("rotacionar identificadores não evita orçamento global", async () => {
    const identifiers = Array.from(
      { length: 25 },
      () => `${randomUUID()}@example.test`,
    );
    identifiers.forEach((email) => {
      fixtureRateKey(email);
    });
    const results = await Promise.all(
      identifiers.map((email) => reserveLoginAttempt(email)),
    );
    expect(results.filter(Boolean)).toHaveLength(20);
    const [global] =
      await client`SELECT attempts FROM login_rate_limits WHERE key='global'`;
    expect(global.attempts).toBe(20);
  });
  it("limite global bloqueia antes do hashing e limpa expirados ao reabrir", async () => {
    const expiredKey = fixtureRateKey(`${randomUUID()}@example.test`);
    await client`INSERT INTO login_rate_limits(key,attempts,started_at,expires_at) VALUES (${expiredKey},1,CURRENT_TIMESTAMP-interval '20 minutes',CURRENT_TIMESTAMP-interval '5 minutes')`;
    await client`INSERT INTO login_rate_limits(key,attempts,started_at,expires_at) VALUES ('global',20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '1 minute')`;
    const passwordSpy = vi.spyOn(passwordOperations, "verifyPassword");
    expect(await login({ email: emails[0], password })).toEqual({
      success: false,
      code: "RATE_LIMITED",
    });
    expect(passwordSpy).not.toHaveBeenCalled();
    await client`UPDATE login_rate_limits SET started_at=CURRENT_TIMESTAMP-interval '2 minutes',expires_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE key='global'`;
    expect(await reserveLoginAttempt(emails[0])).toBe(true);
    expect(
      await client`SELECT key FROM login_rate_limits WHERE key=${expiredKey}`,
    ).toHaveLength(0);
  });
  it("somente dois slots executam operação concorrente, sem fila de hashing", async () => {
    let release = () => {};
    let started = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bothStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let entered = 0;
    const operation = async () => {
      if (++entered === 2) started();
      await hold;
      return "done";
    };
    const a = withLoginHashSlot(operation);
    const b = withLoginHashSlot(operation);
    try {
      await bothStarted;
      expect(
        await withLoginHashSlot(async () => {
          throw new Error("should not execute");
        }),
      ).toEqual({ admitted: false });
      expect(entered).toBe(2);
    } finally {
      release();
      await Promise.all([a, b]);
    }
    expect(await withLoginHashSlot(async () => "released")).toEqual({
      admitted: true,
      value: "released",
    });
  });
  it("slots ocupados bloqueiam login antes de Argon2 e libera após rollback", async () => {
    const held = await getDb().$client.reserve();
    try {
      await held`BEGIN`;
      await held`SELECT pg_advisory_xact_lock(1195524428,0),pg_advisory_xact_lock(1195524428,1)`;
      const passwordSpy = vi.spyOn(passwordOperations, "verifyPassword");
      expect(await login({ email: emails[0], password })).toEqual({
        success: false,
        code: "RATE_LIMITED",
      });
      expect(passwordSpy).not.toHaveBeenCalled();
    } finally {
      await held`ROLLBACK`;
      held.release();
    }
    await expect(
      withLoginHashSlot(async () => {
        throw new Error("sensitive payload");
      }),
    ).rejects.toThrow("Não foi possível processar a autenticação.");
    expect(await withLoginHashSlot(async () => true)).toEqual({
      admitted: true,
      value: true,
    });
  });
  it("constraints, unicidade e erros operacionais não expõem payload", async () => {
    await reserveLoginAttempt(emails[0]);
    await expect(
      client`INSERT INTO login_rate_limits(key,attempts,started_at,expires_at) VALUES (${keys[0]},1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+interval '1 minute')`,
    ).rejects.toMatchObject({ code: "23505" });
    for (const attempts of [0, -1, 21])
      await expect(
        client`UPDATE login_rate_limits SET attempts=${attempts} WHERE key=${keys[0]}`,
      ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE login_rate_limits SET key='raw-email@example.test' WHERE key=${keys[0]}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE login_rate_limits SET expires_at=started_at WHERE key=${keys[0]}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE login_rate_limits SET attempts=NULL WHERE key=${keys[0]}`,
    ).rejects.toMatchObject({ code: "23502" });
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = await withLoginHashSlot(async () => {
      throw new Error(`password=${password}`);
    }).catch((failure: Error) => failure);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Não foi possível processar a autenticação.",
    );
    expect((error as Error).cause).toBeUndefined();
    expect((error as Error).stack).not.toContain(password);
    expect(Object.keys(logSpy.mock.calls[0][0]).sort()).toEqual([
      "correlationId",
      "event",
      "operation",
      "result",
      "timestamp",
    ]);
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(password);
  });
  it.each([
    null,
    "null",
    "https://evil.test",
    "http://localhost:4000",
  ])("todas as Actions rejeitam Origin inválida antes do DB", async (origin) => {
    const dbSpy = vi.spyOn(databaseInfrastructure, "getDb");
    request.headers = new Headers({
      host: "localhost:3000",
      ...(origin ? { origin } : {}),
      "x-forwarded-host": origin ?? "localhost:3000",
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "1.2.3.4",
    });
    await expect(loginAction({ email: emails[0], password })).rejects.toThrow(
      "Requisição inválida.",
    );
    await expect(logoutAction()).rejects.toThrow("Requisição inválida.");
    await expect(readIdentityAction({ userId })).rejects.toThrow(
      "Requisição inválida.",
    );
    expect(dbSpy).not.toHaveBeenCalled();
  });
  it("falha do logger no limiar não impede login válido ou revogação", async () => {
    for (let attempt = 0; attempt < 4; attempt++)
      expect(await reserveLoginAttempt(emails[0])).toBe(true);
    const log = vi.spyOn(console, "warn").mockImplementation(() => {
      throw new Error("private sink failure");
    });
    expect(await loginAction({ email: emails[0], password })).toEqual({
      success: true,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const token = request.token;
    expect(await resolveSession(token)).toEqual({
      id: userId,
      email: emails[0],
    });
    expect(await logoutAction()).toEqual({ success: true });
    expect(await resolveSession(token)).toBeNull();
  });
  it("produção exige HTTPS; headers IP forjados não alteram chave", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(loginAction({ email: emails[0], password })).rejects.toThrow(
      "Requisição inválida.",
    );
    request.headers = new Headers({
      origin: "https://localhost:3000",
      host: "localhost:3000",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(await loginAction({ email: emails[0], password })).toEqual({
      success: true,
    });
    expect(request.lastCookie?.options).toMatchObject({
      secure: true,
      httpOnly: true,
    });
    request.headers.set("x-forwarded-for", "9.9.9.9");
    await reserveLoginAttempt(emails[0]);
    const [row] =
      await client`SELECT attempts FROM login_rate_limits WHERE key=${keys[0]}`;
    expect(row.attempts).toBe(2);
    expect(await logoutAction()).toEqual({ success: true });
    expect(await logoutAction()).toEqual({ success: true });
  });
});

describe("ECMSG-33: cadastro seguro PostgreSQL", () => {
  const emails = [randomUUID(), randomUUID()].map((id) => `${id}@example.test`);
  emails.forEach((email) => {
    fixtureRateKey(email, "reg");
  });
  beforeEach(() => {
    request.headers = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    request.token = undefined;
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await client`DELETE FROM users WHERE email IN (${emails[0]},${emails[1]})`;
  });
  it("normaliza, persiste somente hash e cadastro duplicado não muda senha ou resposta", async () => {
    const input = { email: `  ${emails[0].toUpperCase()}  `, password };
    const first = await registerAction(input);
    expect(first).toEqual({ success: true });
    expect(request.token).toBeUndefined();
    const [stored] =
      await client`SELECT password_hash FROM users WHERE email=${emails[0]}`;
    expect(stored.password_hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(password, stored.password_hash)).toBe(true);
    expect(
      await registerAction({ ...input, password: "Other valid passphrase" }),
    ).toEqual(first);
    const [same] =
      await client`SELECT password_hash FROM users WHERE email=${emails[0]}`;
    expect(same.password_hash === stored.password_hash).toBe(true);
  });
  it("duas criações concorrentes mantêm apenas uma identidade", async () => {
    const results = await Promise.all([
      registerAction({ email: emails[1], password }),
      registerAction({ email: emails[1], password }),
    ]);
    expect(results).toEqual([{ success: true }, { success: true }]);
    expect(
      (await client`SELECT id FROM users WHERE email=${emails[1]}`).length,
    ).toBe(1);
  });
  it("payload inválido/extra falha antes de DB e hash", async () => {
    const db = vi.spyOn(databaseInfrastructure, "getDb");
    const hashing = vi.spyOn(passwordOperations, "hashPassword");
    for (const input of [
      null,
      { email: emails[0], password: "short" },
      { email: emails[0], password, passwordHash: "fake" },
      { email: emails[0], password: "x".repeat(300) },
    ])
      expect(await registerAction(input)).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    expect(
      await registerAction({ email: emails[0], password }, "extra"),
    ).toEqual({ success: false, code: "INVALID_INPUT" });
    expect(db).not.toHaveBeenCalled();
    expect(hashing).not.toHaveBeenCalled();
  });
  it("terceira tentativa bloqueia antes de Argon2 sem afetar login por conta", async () => {
    const hashing = vi.spyOn(passwordOperations, "hashPassword");
    for (let i = 0; i < 2; i++)
      expect(await registerAction({ email: emails[0], password })).toEqual({
        success: true,
      });
    expect(await registerAction({ email: emails[0], password })).toEqual({
      success: false,
      code: "RATE_LIMITED",
    });
    expect(hashing).toHaveBeenCalledTimes(2);
    expect(await reserveLoginAttempt(emails[0])).toBe(true);
    fixtureRateKey(emails[0]);
  });
  it("origem indevida e falhas operacionais não expõem input", async () => {
    request.headers.set("origin", "https://evil.test");
    await expect(
      registerAction({ email: emails[0], password }),
    ).rejects.toThrow("Requisição inválida.");
    request.headers.set("origin", "http://localhost:3000");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(databaseInfrastructure, "getDb").mockImplementation(() => {
      throw new Error(password);
    });
    await expect(
      registerAction({ email: emails[0], password }),
    ).rejects.toThrow("Não foi possível processar a autenticação.");
  });
});

describe("ECMSG-36: área da própria conta", () => {
  const email = `${randomUUID()}@example.test`;
  let id: string;
  beforeAll(async () => {
    const [user] = await database
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id });
    id = user.id;
  });
  afterAll(async () => {
    await client`DELETE FROM users WHERE id=${id}`;
  });
  it("visitante e token inválido não recebem dado", async () => {
    request.token = undefined;
    expect(await readAccount()).toBeNull();
    request.token = "invalid";
    expect(await readAccount()).toBeNull();
  });
  it("sessão válida recebe somente e-mail próprio", async () => {
    request.token = (await createSession(id)).token;
    expect(await readAccount()).toEqual({ email });
  });
  it("revogação e expiração impedem leitura", async () => {
    const session = await createSession(id);
    request.token = session.token;
    await revokeSession(session.token);
    expect(await readAccount()).toBeNull();
    const next = await createSession(id);
    request.token = next.token;
    await client`UPDATE sessions SET created_at=CURRENT_TIMESTAMP-interval '9 hours',last_active_at=CURRENT_TIMESTAMP-interval '1 hour',expires_at=CURRENT_TIMESTAMP-interval '1 minute' WHERE token_hash=${tokenHash(next.token)}`;
    expect(await readAccount()).toBeNull();
  });
});

describe("ECMSG-37: troca de senha e revogação atômica", () => {
  afterEach(() => vi.restoreAllMocks());
  const email = `${randomUUID()}@example.test`;
  const nextPassword = "New integration passphrase 37";
  let id: string;
  fixtureRateKey(email, "pwd");
  fixtureRateKey(email);
  beforeAll(async () => {
    const [user] = await database
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id });
    id = user.id;
  });
  beforeEach(async () => {
    await client`UPDATE users SET password_hash=${passwordHash} WHERE id=${id}`;
    await client`DELETE FROM sessions WHERE user_id=${id}`;
    request.token = undefined;
    request.lastCookie = undefined;
    request.headers = new Headers({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    vi.stubEnv("NODE_ENV", "test");
  });
  afterAll(async () => {
    await client`DELETE FROM users WHERE id=${id}`;
  });
  const input = () => ({
    currentPassword: password,
    newPassword: nextPassword,
  });
  it("exige sessão e rejeita autoridade/campos extras antes do hashing", async () => {
    const verify = vi.spyOn(passwordOperations, "verifyPassword");
    expect(await changePasswordAction(input())).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    request.token = (await createSession(id)).token;
    for (const value of [
      { ...input(), userId: id },
      { ...input(), newPassword: "short" },
      { ...input(), currentPassword: "x".repeat(257) },
    ])
      expect(await changePasswordAction(value)).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    expect(await changePasswordAction(input(), "extra")).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(verify).not.toHaveBeenCalled();
  });
  it("senha atual incorreta não altera credencial nem revoga", async () => {
    const session = await createSession(id);
    request.token = session.token;
    expect(
      await changePasswordAction({
        ...input(),
        currentPassword: "Incorrect value",
      }),
    ).toEqual({ success: false, code: "INVALID_CREDENTIALS" });
    const [row] = await client`SELECT password_hash FROM users WHERE id=${id}`;
    expect(row.password_hash).toBe(passwordHash);
    expect(await resolveSession(session.token)).not.toBeNull();
  });
  it("altera hash, revoga todas as sessões e expira cookie sem expor dados", async () => {
    const first = await createSession(id);
    const second = await createSession(id);
    request.token = first.token;
    const result = await changePasswordAction(input());
    expect(result).toEqual({ success: true });
    const [row] = await client`SELECT password_hash FROM users WHERE id=${id}`;
    expect(row.password_hash).not.toBe(passwordHash);
    expect(await verifyPassword(password, row.password_hash)).toBe(false);
    expect(await verifyPassword(nextPassword, row.password_hash)).toBe(true);
    expect(await resolveSession(first.token)).toBeNull();
    expect(await resolveSession(second.token)).toBeNull();
    expect(request.lastCookie).toMatchObject({
      value: "",
      options: { maxAge: 0, httpOnly: true, path: "/" },
    });
    expect(await loginAction({ email, password: nextPassword })).toEqual({
      success: true,
    });
    expect(await resolveSession(request.token)).toEqual({ id, email });
    expect(await loginAction({ email, password })).toEqual({
      success: false,
      message: "Credenciais inválidas.",
    });
  });
  it("sessão expirada e replay revogado não mudam senha", async () => {
    const session = await createSession(id);
    request.token = session.token;
    await client`UPDATE sessions SET last_active_at=CURRENT_TIMESTAMP-interval '31 minutes',created_at=CURRENT_TIMESTAMP-interval '1 hour' WHERE token_hash=${tokenHash(session.token)}`;
    expect(await changePasswordAction(input())).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    await revokeSession(session.token);
    expect(await changePasswordAction(input())).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
  it("quarta tentativa bloqueia antes de verificar senha", async () => {
    request.token = (await createSession(id)).token;
    const verify = vi.spyOn(passwordOperations, "verifyPassword");
    for (let i = 0; i < 3; i++)
      expect(
        (
          await changePasswordAction({
            ...input(),
            currentPassword: "Incorrect value",
          })
        ).success,
      ).toBe(false);
    expect(await changePasswordAction(input())).toEqual({
      success: false,
      code: "RATE_LIMITED",
    });
    expect(verify).toHaveBeenCalledTimes(3);
  });
  it("duas trocas concorrentes com a mesma sessão têm um único sucesso", async () => {
    request.token = (await createSession(id)).token;
    const { changePassword } = await import("./change-password");
    const results = await Promise.all([
      changePassword(input(), request.token),
      changePassword(
        { ...input(), newPassword: "Another integration passphrase" },
        request.token,
      ),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    const [row] =
      await client`SELECT count(*)::int AS count FROM sessions WHERE user_id=${id}`;
    expect(row.count).toBe(0);
  });
  it("login verificado antes da troca não cria sessão com credencial antiga", async () => {
    const verified = await login({ email, password });
    expect(verified.success).toBe(true);
    if (!verified.success) throw new Error("Fixture de autenticação inválida");
    request.token = (await createSession(id)).token;
    expect(await changePasswordAction(input())).toEqual({ success: true });
    await expect(
      createSession(verified.userId, undefined, verified.credentialHash),
    ).rejects.toThrow("Não foi possível processar a sessão.");
    const [row] =
      await client`SELECT count(*)::int AS count FROM sessions WHERE user_id=${id}`;
    expect(row.count).toBe(0);
  });
  it("origem indevida não alcança mudança de credencial", async () => {
    request.token = (await createSession(id)).token;
    request.headers.set("origin", "https://evil.test");
    await expect(changePasswordAction(input())).rejects.toThrow(
      "Requisição inválida.",
    );
  });
});
