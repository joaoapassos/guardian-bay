import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import { readTestCards, removeTestCard, saveTestCard } from "./test-cards";

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
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const hash = await hashPassword("Payment integration passphrase");
  const rows =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@payment.example.test`},${hash}),(${`${randomUUID()}@payment.example.test`},${hash}) RETURNING id`;
  [userId, otherId] = rows.map((row) => row.id);
});
beforeEach(async () => {
  await client`DELETE FROM saved_test_cards WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  token = (await createSession(userId)).token;
  request.token = token;
});
afterAll(async () => {
  await client`DELETE FROM saved_test_cards WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
const card = { fixtureId: "test-1", expiryMonth: 12, expiryYear: 2099 };
it("cards: deduplicates concurrent registrations and exposes only masked DTOs", async () => {
  const results = await Promise.all([saveTestCard(card), saveTestCard(card)]);
  expect(results.every((r) => r.success)).toBe(true);
  const cards = await readTestCards();
  expect(cards).toHaveLength(1);
  expect(Object.keys(cards[0]).sort()).toEqual(
    ["id", "brand", "last4", "expiryMonth", "expiryYear"].sort(),
  );
  expect(cards[0].last4).toBe("0001");
  expect(await saveTestCard({ ...card, pan: "4111111111111111" })).toEqual({
    success: false,
    code: "INVALID_INPUT",
  });
  expect(
    await saveTestCard({ ...card, expiryYear: 2026, expiryMonth: 1 }),
  ).toEqual({ success: false, code: "INVALID_INPUT" });
});
it("cards: ownership is enforced on reads/removal and sessions are live", async () => {
  await saveTestCard(card);
  const [own] = await readTestCards();
  request.token = (await createSession(otherId)).token;
  expect(await readTestCards()).toEqual([]);
  expect((await removeTestCard({ cardId: own.id })).success).toBe(true);
  request.token = token;
  expect(await readTestCards()).toHaveLength(1);
  await client`UPDATE sessions SET created_at=clock_timestamp() - interval '9 hours', last_active_at=clock_timestamp() - interval '9 hours', expires_at=clock_timestamp() - interval '1 hour' WHERE user_id=${userId}`;
  expect(await removeTestCard({ cardId: own.id })).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  expect(await readTestCards()).toEqual([]);
});
it("cards: PostgreSQL constraints reject arbitrary metadata and budget caps mutations", async () => {
  await expect(
    client`INSERT INTO saved_test_cards(user_id,fixture_id,brand,last4,expiry_month,expiry_year) VALUES (${userId},'test-1','TEST','9999',12,2099)`,
  ).rejects.toMatchObject({ code: "23514" });
  for (let i = 0; i < 10; i++)
    expect((await saveTestCard(card)).success).toBe(true);
  expect(await saveTestCard(card)).toEqual({
    success: false,
    code: "RATE_LIMITED",
  });
});
