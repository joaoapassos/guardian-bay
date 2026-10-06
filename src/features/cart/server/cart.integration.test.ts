import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import { readCart } from "./read-cart";

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
const suffix = randomUUID();
let categoryId: string;
let productId: string;
let otherId: string;
let userId: string;
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Fixture ${suffix}`}) RETURNING id`;
  categoryId = category.id;
  const passwordHash = await hashPassword("Catalog integration passphrase");
  const [user] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@catalog.example.test`},${passwordHash}) RETURNING id`;
  userId = user.id;
  const [other] =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${suffix}@cart-other.example.test`},${passwordHash}) RETURNING id`;
  otherId = other.id;
  const [product] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Cart fixture',${categoryId},1099,true) RETURNING id`;
  productId = product.id;
});

afterAll(async () => {
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM products WHERE category_id=${categoryId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});

describe("ECMSG-55: persistência real", () => {
  it("default, unicidade por dono e quantidade limitada", async () => {
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
    const [row] =
      await client`SELECT * FROM cart_items WHERE user_id=${userId}`;
    expect(row).toEqual({
      user_id: userId,
      product_id: productId,
      quantity: 1,
    });
    await expect(
      client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`,
    ).rejects.toMatchObject({ code: "23505" });
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${otherId},${productId})`;
    for (const quantity of [0, -1, 100])
      await expect(
        client`UPDATE cart_items SET quantity=${quantity} WHERE user_id=${userId}`,
      ).rejects.toMatchObject({ code: "23514" });
    await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  });
  it("FK e remoções restritivas preservam ownership estrutural", async () => {
    await expect(
      client`INSERT INTO cart_items(user_id,product_id) VALUES (${randomUUID()},${productId})`,
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${randomUUID()})`,
    ).rejects.toMatchObject({ code: "23503" });
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
    await expect(
      client`DELETE FROM users WHERE id=${userId}`,
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      client`DELETE FROM products WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23503" });
    await client`DELETE FROM cart_items WHERE user_id=${userId}`;
  });
});

describe("ECMSG-56: leitura autorizada", () => {
  it("visitante, vazio e isolamento A/B com DTO mínimo", async () => {
    request.token = undefined;
    expect(await readCart()).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    request.token = (await createSession(userId)).token;
    expect(await readCart()).toEqual({ success: true, items: [] });
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},2)`;
    expect(await readCart()).toEqual({ success: true, items: [] });
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},3)`;
    const result = await readCart();
    expect(result).toMatchObject({
      success: true,
      items: [
        {
          productId,
          quantity: 3,
          available: true,
          price: { amount: 1099, currency: "BRL" },
        },
      ],
    });
    if (result.success)
      expect(Object.keys(result.items[0])).toEqual([
        "productId",
        "name",
        "quantity",
        "available",
        "price",
        "image",
      ]);
    await client`UPDATE products SET is_published=false WHERE id=${productId}`;
    expect(await readCart()).toMatchObject({
      success: true,
      items: [{ available: false }],
    });
    await client`UPDATE products SET is_published=true WHERE id=${productId}`;
    await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  });
});
