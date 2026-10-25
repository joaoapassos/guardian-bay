import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import {
  createAddressAction,
  removeAddressAction,
  updateAddressAction,
} from "../actions/address.action";
import { readAddresses } from "./read-addresses";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  token: undefined as string | undefined,
  headers: new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({
    get: () => (request.token ? { value: request.token } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
const client = postgres(value, { max: 1, onnotice: () => {} });
let userId: string;
let otherId: string;
const input = {
  recipient: "Ana",
  postalCode: "12345-678",
  street: "Rua Flores",
  number: "1",
  complement: "",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};
beforeAll(async () => {
  // The suite requires the test harness to apply migrations; it never migrates a database.
  vi.stubEnv("DATABASE_URL", value);
  const passwordHash = await hashPassword("Address integration passphrase");
  const suffix = randomUUID();
  const [user] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@address.example.test`},${passwordHash}) RETURNING id`;
  const [other] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@other.example.test`},${passwordHash}) RETURNING id`;
  userId = user.id;
  otherId = other.id;
});
beforeEach(async () => {
  await client`DELETE FROM addresses WHERE user_id IN (${userId},${otherId})`;
  request.token = (await createSession(userId)).token;
  request.headers = new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  });
});
afterAll(async () => {
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

describe("private addresses", () => {
  it("creates normalized data and returns a minimal private DTO", async () => {
    expect(await createAddressAction(input)).toEqual({ success: true });
    const result = await readAddresses();
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected addresses");
    expect(result.addresses).toHaveLength(1);
    expect(result.addresses[0]).toMatchObject({
      postalCode: "12345678",
      revision: 1,
    });
    expect(result.addresses[0]).not.toHaveProperty("userId");
    request.token = (await createSession(otherId)).token;
    expect(await readAddresses()).toEqual({ success: true, addresses: [] });
  });
  it("rejects cross-owner updates/removal and stale revisions", async () => {
    await createAddressAction(input);
    const [row] =
      await client`SELECT id,revision FROM addresses WHERE user_id=${userId}`;
    request.token = (await createSession(otherId)).token;
    expect(
      await updateAddressAction({ ...input, ...row, city: "Outra" }),
    ).toMatchObject({ success: false, code: "CONFLICT" });
    expect(await removeAddressAction(row)).toMatchObject({
      success: false,
      code: "CONFLICT",
    });
    request.token = (await createSession(userId)).token;
    expect(
      await updateAddressAction({ ...input, ...row, city: "Santos" }),
    ).toEqual({ success: true });
    expect(await removeAddressAction(row)).toMatchObject({
      success: false,
      code: "CONFLICT",
    });
    expect(await removeAddressAction({ ...row, revision: 2 })).toEqual({
      success: true,
    });
  });
  it("serializes concurrent creates at the account limit", async () => {
    for (let i = 0; i < 19; i++) await createAddressAction(input);
    const results = await Promise.all([
      createAddressAction(input),
      createAddressAction(input),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results).toContainEqual({ success: false, code: "LIMIT_REACHED" });
    const [row] =
      await client`SELECT count(*)::int AS count FROM addresses WHERE user_id=${userId}`;
    expect(row.count).toBe(20);
  });
  it("rejects expired sessions and strict payload authority", async () => {
    expect(
      await createAddressAction({ ...input, userId: otherId }),
    ).toMatchObject({ success: false, code: "INVALID_INPUT" });
    await client`UPDATE sessions SET created_at=clock_timestamp()-interval '2 hours',last_active_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE user_id=${userId}`;
    expect(await createAddressAction(input)).toMatchObject({
      success: false,
      code: "UNAUTHENTICATED",
    });
    expect(await readAddresses()).toMatchObject({
      success: false,
      code: "UNAUTHENTICATED",
    });
  });
  it("rejects foreign-origin action requests", async () => {
    request.headers.set("origin", "https://foreign.example");
    await expect(createAddressAction(input)).rejects.toThrow();
    const [row] =
      await client`SELECT count(*)::int AS count FROM addresses WHERE user_id=${userId}`;
    expect(row.count).toBe(0);
  });
});
