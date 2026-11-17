import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/counts/route";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession, revokeSession } from "@/features/auth/server/session";

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
const client = postgres(value, { max: 1, onnotice: () => {} });
const adminId = randomUUID();
const customerId = randomUUID();
const categoryId = randomUUID();
const productId = randomUUID();

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  const passwordHash = await hashPassword("Synthetic Fixture 2026!");
  await client`INSERT INTO users(id, email, password_hash, role) VALUES (${adminId}, ${`${adminId}@example.test`}, ${passwordHash}, 'admin'), (${customerId}, ${`${customerId}@example.test`}, ${passwordHash}, 'customer')`;
});
afterAll(async () => {
  request.token = undefined;
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client`DELETE FROM users WHERE id IN (${adminId}, ${customerId})`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

it("consultas autorizadas refletem novos registros e rejeitam visitante, cliente e sessão revogada", async () => {
  expect((await GET()).status).toBe(401);
  const customerSession = await createSession(customerId);
  request.token = customerSession.token;
  expect((await GET()).status).toBe(403);
  const adminSession = await createSession(adminId);
  request.token = adminSession.token;
  const beforeResponse = await GET();
  expect(beforeResponse.status).toBe(200);
  const before = await beforeResponse.json();
  await client`INSERT INTO categories(id, name) VALUES (${categoryId}, ${`Fixture ${categoryId}`})`;
  await client`INSERT INTO products(id, name, category_id, amount, is_published) VALUES (${productId}, 'Rascunho de teste', ${categoryId}, 100, false)`;
  const after = await (await GET()).json();
  expect(after.categories).toBe(before.categories + 1);
  expect(after.products).toBe(before.products + 1);
  await revokeSession(adminSession.token);
  expect((await GET()).status).toBe(401);
});
