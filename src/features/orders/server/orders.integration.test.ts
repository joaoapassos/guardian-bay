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
});
beforeEach(async () => {
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`UPDATE products SET name='Order fixture',amount=1099,is_published=true WHERE id=${productId}`;
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
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
it("ECMSG-67: defaults, FK, idempotência por dono e constraints comerciais", async () => {
  const key = randomUUID();
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${userId},${key},1099) RETURNING *`;
  expect(order.status).toBe("PENDING_PAYMENT");
  expect(order.currency).toBe("BRL");
  expect(Number.isFinite(new Date(order.created_at).getTime())).toBe(true);
  await expect(
    client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${userId},${key},1099)`,
  ).rejects.toMatchObject({ code: "23505" });
  await client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${otherId},${key},1099)`;
  await expect(
    client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${randomUUID()},${randomUUID()},1)`,
  ).rejects.toMatchObject({ code: "23503" });
  for (const total of [0, -1, 21260088105301])
    await expect(
      client`UPDATE orders SET total_amount=${total} WHERE id=${order.id}`,
    ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE orders SET status='SHIPPED' WHERE id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE orders SET currency='USD' WHERE id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
  await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Snapshot',2,1099,2198)`;
  for (const quantity of [0, -1, 100])
    await expect(
      client`UPDATE order_items SET quantity=${quantity} WHERE order_id=${order.id}`,
    ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE order_items SET subtotal_amount=1 WHERE order_id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE order_items SET order_id=${randomUUID()} WHERE order_id=${order.id}`,
  ).rejects.toMatchObject({ code: "23503" });
  await expect(
    client`DELETE FROM users WHERE id=${userId}`,
  ).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
});

it("ECMSG-69: preview exige sessão, carrinho próprio completo e catálogo atual", async () => {
  const { checkoutPreview } = await import("./checkout-preview");
  request.token = undefined;
  expect(await checkoutPreview()).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  request.token = (await createSession(userId)).token;
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${otherId},${productId})`;
  expect(await checkoutPreview()).toEqual({
    success: false,
    code: "EMPTY_CART",
  });
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  expect(await checkoutPreview()).toMatchObject({
    success: true,
    snapshot: { total: { amount: 2198 } },
  });
  await client`UPDATE products SET amount=1201 WHERE id=${productId}`;
  expect(await checkoutPreview()).toMatchObject({
    success: true,
    snapshot: { total: { amount: 2402 } },
  });
  await client`UPDATE products SET is_published=false WHERE id=${productId}`;
  expect(await checkoutPreview()).toEqual({
    success: false,
    code: "UNAVAILABLE",
  });
  expect(
    await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(1);
});
it("ECMSG-70: double submit/retry e chave igual entre usuários são isolados", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const checkoutKey = randomUUID();
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2),(${otherId},${productId},1)`;
  const pair = await Promise.all([
    checkoutAction({ checkoutKey }),
    checkoutAction({ checkoutKey }),
  ]);
  expect(pair[0]).toEqual(pair[1]);
  expect(pair[0]).toMatchObject({ success: true });
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(1);
  await client`UPDATE products SET name='Changed after snapshot',amount=1200 WHERE id=${productId}`;
  expect(await checkoutAction({ checkoutKey })).toEqual(pair[0]);
  expect(
    await client`SELECT product_name,unit_amount,subtotal_amount FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id=${userId})`,
  ).toMatchObject([
    {
      product_name: "Order fixture",
      unit_amount: 1099,
      subtotal_amount: "2198",
    },
  ]);
  request.token = (await createSession(otherId)).token;
  expect(await checkoutAction({ checkoutKey })).toMatchObject({
    success: true,
  });
  expect(
    await client`SELECT id FROM orders WHERE checkout_key=${checkoutKey}`,
  ).toHaveLength(2);
});
it("ECMSG-71: aprovação/recusa são server-side, replay preserva resultado", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const key = randomUUID();
  expect(await checkoutAction({ checkoutKey: key })).toMatchObject({
    success: true,
    status: "PAID",
  });
  await client`UPDATE products SET amount=1000000 WHERE id=${productId}`;
  expect(await checkoutAction({ checkoutKey: key })).toMatchObject({
    success: true,
    status: "PAID",
  });
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId}) ON CONFLICT DO NOTHING`;
  const failedKey = randomUUID();
  const failed = await checkoutAction({ checkoutKey: failedKey });
  expect(failed).toMatchObject({ success: true, status: "PAYMENT_FAILED" });
  expect(await checkoutAction({ checkoutKey: failedKey })).toEqual(failed);
  expect(
    await checkoutAction({ checkoutKey: randomUUID(), paymentStatus: "PAID" }),
  ).toEqual({ success: false, code: "INVALID_INPUT" });
});
