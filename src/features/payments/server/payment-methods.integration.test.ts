import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import {
  readPaymentMethods,
  removePaymentMethod,
  resolveCheckoutCard,
  savePaymentMethod,
} from "./payment-methods";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: request.token }) }),
}));
const value = process.env.TEST_DATABASE_URL;
if (
  !value ||
  new URL(value).pathname !== "/guardian_bay_test" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname) ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === new URL(value).pathname)
)
  throw new Error("Dedicated local test database required");
const client = postgres(value, { max: 1, onnotice: () => {} });
let userId: string;
let otherId: string;
let token: string;
const card = {
  number: "4111 1111 1111 1111",
  expiryMonth: 12,
  expiryYear: 2099,
};

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  const hash = await hashPassword("Payment methods test passphrase");
  const rows =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@methods.example.test`},${hash}),(${`${randomUUID()}@methods.example.test`},${hash}) RETURNING id`;
  [userId, otherId] = rows.map((row) => row.id);
});
beforeEach(async () => {
  await client`DELETE FROM saved_payment_methods WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  token = (await createSession(userId)).token;
  request.token = token;
});
afterAll(async () => {
  await client`DELETE FROM saved_payment_methods WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

it("saves only derived metadata and returns a minimal masked DTO", async () => {
  expect(await savePaymentMethod(card)).toEqual({ success: true });
  const result = await readPaymentMethods();
  if (!result.success) throw new Error("Expected authenticated result");
  expect(result.paymentMethods).toEqual([
    {
      id: expect.any(String),
      brand: "VISA",
      last4: "1111",
      expiryMonth: 12,
      expiryYear: 2099,
    },
  ]);
  const [stored] =
    await client`SELECT * FROM saved_payment_methods WHERE user_id=${userId}`;
  expect(Object.keys(stored).sort()).toEqual(
    [
      "id",
      "user_id",
      "brand",
      "last4",
      "expiry_month",
      "expiry_year",
      "created_at",
    ].sort(),
  );
  expect(JSON.stringify(stored)).not.toContain("4111111111111111");
  expect(await savePaymentMethod({ ...card, cvv: "123" })).toEqual({
    success: false,
    code: "INVALID_INPUT",
  });
  expect(
    await savePaymentMethod({ ...card, number: "4111111111111112" }),
  ).toEqual({ success: false, code: "INVALID_INPUT" });
});

it("scopes reads, removal and checkout references to the live session owner", async () => {
  await savePaymentMethod(card);
  const result = await readPaymentMethods();
  if (!result.success) throw new Error("Expected authenticated result");
  const id = result.paymentMethods[0].id;
  request.token = (await createSession(otherId)).token;
  expect(await readPaymentMethods()).toEqual({
    success: true,
    paymentMethods: [],
  });
  expect(await removePaymentMethod({ id })).toEqual({ success: true });
  expect(
    await getDb().transaction((tx) =>
      resolveCheckoutCard(tx, otherId, { method: "CARD", paymentMethodId: id }),
    ),
  ).toEqual({ success: false, code: "INVALID_INPUT" });
  request.token = token;
  expect((await readPaymentMethods()).success).toBe(true);
  const [count] =
    await client`SELECT count(*)::int AS n FROM saved_payment_methods WHERE user_id=${userId}`;
  expect(count.n).toBe(1);
  await client`UPDATE sessions SET created_at=clock_timestamp()-interval '2 hours',last_active_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE user_id=${userId}`;
  expect(await removePaymentMethod({ id })).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  expect(await readPaymentMethods()).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
});

it("serializes concurrent saves at the three-method cap and enforces the mutation budget", async () => {
  const results = await Promise.all(
    Array.from({ length: 4 }, () => savePaymentMethod(card)),
  );
  expect(results.filter((result) => result.success)).toHaveLength(3);
  expect(results.filter((result) => !result.success)).toEqual([
    { success: false, code: "LIMIT_REACHED" },
  ]);
  for (let attempt = 0; attempt < 6; attempt++) await savePaymentMethod(card);
  expect(await savePaymentMethod(card)).toEqual({
    success: false,
    code: "RATE_LIMITED",
  });
});

it("rejects expired saved references at database time and never saves during resolution", async () => {
  await savePaymentMethod(card);
  const [stored] =
    await client`SELECT id FROM saved_payment_methods WHERE user_id=${userId}`;
  await client`UPDATE saved_payment_methods SET expiry_year=2000 WHERE id=${stored.id}`;
  expect(
    await getDb().transaction((tx) =>
      resolveCheckoutCard(tx, userId, {
        method: "CARD",
        paymentMethodId: stored.id,
      }),
    ),
  ).toEqual({ success: false, code: "INVALID_INPUT" });
  expect(
    await getDb().transaction((tx) =>
      resolveCheckoutCard(tx, userId, { method: "CARD", card, save: true }),
    ),
  ).toEqual({
    success: true,
    card: { brand: "VISA", last4: "1111", expiryMonth: 12, expiryYear: 2099 },
  });
  const [count] =
    await client`SELECT count(*)::int AS n FROM saved_payment_methods WHERE user_id=${userId}`;
  expect(count.n).toBe(1);
});

it("enforces metadata constraints in PostgreSQL", async () => {
  await expect(
    client`INSERT INTO saved_payment_methods(user_id,brand,last4,expiry_month,expiry_year) VALUES (${userId},'INVENTED','1111',12,2099)`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`INSERT INTO saved_payment_methods(user_id,brand,last4,expiry_month,expiry_year) VALUES (${userId},'VISA','PAN',12,2099)`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`INSERT INTO saved_payment_methods(user_id,brand,last4,expiry_month,expiry_year) VALUES (${userId},'VISA','1111',13,2099)`,
  ).rejects.toMatchObject({ code: "23514" });
});
