import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";

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
let productId: string;
let categoryId: string;
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const hash = await hashPassword("Order integration passphrase");
  const users =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@order.example.test`},${hash}),(${`${randomUUID()}@order.example.test`},${hash}) RETURNING id`;
  [userId, otherId] = users.map((row) => row.id);
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Order ${randomUUID()}`}) RETURNING id`;
  categoryId = category.id;
  const [product] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Order fixture',${categoryId},1099,true) RETURNING id`;
  productId = product.id;
  await client`INSERT INTO inventory(product_id) VALUES (${productId})`;
});
beforeEach(async () => {
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`UPDATE products SET name='Order fixture',amount=1099,is_published=true WHERE id=${productId}`;
  await client`UPDATE inventory SET available_quantity=0,revision=1 WHERE product_id=${productId}`;
  request.token = (await createSession(userId)).token;
  request.headers = new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  });
});
afterAll(async () => {
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
it("ECMSG-80: defaults, PK/FK, quantidade, overflow, revision e RESTRICT", async () => {
  expect(
    (await client`SELECT * FROM inventory WHERE product_id=${productId}`)[0],
  ).toMatchObject({ available_quantity: 0, revision: 1 });
  await expect(
    client`INSERT INTO inventory(product_id) VALUES (${productId})`,
  ).rejects.toMatchObject({ code: "23505" });
  await expect(
    client`INSERT INTO inventory(product_id) VALUES (${randomUUID()})`,
  ).rejects.toMatchObject({ code: "23503" });
  await expect(
    client`UPDATE inventory SET available_quantity=-1 WHERE product_id=${productId}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE inventory SET available_quantity=2147483648 WHERE product_id=${productId}`,
  ).rejects.toMatchObject({ code: "22003" });
  await expect(
    client`UPDATE inventory SET revision=0 WHERE product_id=${productId}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`DELETE FROM products WHERE id=${productId}`,
  ).rejects.toMatchObject({ code: expect.stringMatching(/^(23001|23503)$/) });
});
it("ECMSG-81: disponibilidade pública mínima, mutável e ausência fechada", async () => {
  const { readAvailability } = await import("./read-availability");
  expect(await readAvailability(productId)).toEqual({ inStock: false });
  await client`UPDATE inventory SET available_quantity=3 WHERE product_id=${productId}`;
  expect(await readAvailability(productId)).toEqual({ inStock: true });
  await client`UPDATE products SET is_published=false WHERE id=${productId}`;
  expect(await readAvailability(productId)).toBeNull();
  await client`UPDATE products SET is_published=true WHERE id=${productId}`;
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  expect(await readAvailability(productId)).toEqual({ inStock: false });
  await client`INSERT INTO inventory(product_id) VALUES (${productId})`;
  expect(await readAvailability("' OR 1=1 --")).toBeNull();
});
