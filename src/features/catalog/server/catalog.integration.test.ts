import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { listProducts } from "./list-products";
import { readProduct } from "./read-product";

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
const client = postgres(value, { max: 1, onnotice: () => {} });
const suffix = randomUUID();
let categoryId: string;
let productId: string;
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Fixture ${suffix}`}) RETURNING id`;
  categoryId = category.id;
});
describe("listagem pública", () => {
  it("não revela rascunhos e mantém paginação/DTO limitado", async () => {
    const [fixture] =
      await client`INSERT INTO products(name,category_id,amount) VALUES ('Produto',${categoryId},1099) RETURNING id`;
    const productId = fixture.id;
    expect(await readProduct(productId)).toBeNull();
    expect(await readProduct(randomUUID())).toBeNull();
    expect(await readProduct("' OR 1=1 --")).toBeNull();
    await client`UPDATE products SET is_published=false WHERE id=${productId}`;
    const hidden = await listProducts({});
    expect(
      hidden.success && hidden.products.some((p) => p.id === productId),
    ).toBe(false);
    await client`UPDATE products SET is_published=true WHERE id=${productId}`;
    expect(await readProduct(productId)).toMatchObject({
      id: productId,
      description: "",
      price: { amount: 1099 },
    });
    for (const query of ["' OR 1=1 --", "%", "_", "\\"]) {
      const result = await listProducts({ query, category: categoryId });
      expect(result.success && result.products).toEqual([]);
    }
    const found = await listProducts({
      query: "prodUTO",
      category: categoryId,
      sort: "price-desc",
    });
    expect(
      found.success && found.products.some((p) => p.id === productId),
    ).toBe(true);
    const missingCategory = await listProducts({ category: randomUUID() });
    expect(missingCategory.success && missingCategory.products).toEqual([]);
    const visible = await listProducts({});
    expect(
      visible.success && visible.products.find((p) => p.id === productId),
    ).toMatchObject({
      name: "Produto",
      price: { amount: 1099, currency: "BRL" },
    });
    const limited = await listProducts({ limit: "1" });
    expect(limited.success && limited.products.length).toBeLessThanOrEqual(1);
    if (visible.success)
      expect(
        Object.keys(visible.products.find((p) => p.id === productId) ?? {}),
      ).toEqual(["id", "name", "category", "price"]);
    for (const input of [
      { page: "0" },
      { page: "1001" },
      { limit: "51" },
      { role: "admin" },
    ])
      expect(await listProducts(input)).toMatchObject({
        success: false,
        code: "INVALID_INPUT",
      });
  });
});
afterAll(async () => {
  await client`DELETE FROM products WHERE category_id=${categoryId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
describe("ECMSG-43: constraints reais do catálogo", () => {
  it("gera identidade e inicia produto privado com preço inteiro BRL", async () => {
    const [row] =
      await client`INSERT INTO products(name,category_id,amount) VALUES ('Produto',${categoryId},1099) RETURNING *`;
    productId = row.id;
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row).toMatchObject({
      amount: 1099,
      currency: "BRL",
      is_published: false,
      description: "",
      revision: 1,
    });
  });
  it("categoria única sem distinção de caixa e remoção restritiva", async () => {
    await expect(
      client`INSERT INTO categories(name) VALUES (${`FIXTURE ${suffix.toUpperCase()}`})`,
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      client`DELETE FROM categories WHERE id=${categoryId}`,
    ).rejects.toMatchObject({ code: "23001" });
  });
  it("banco rejeita nomes/preço/moeda/revisão/descrição inválidos", async () => {
    for (const name of ["", " padded ", "x".repeat(121)])
      await expect(
        client`UPDATE products SET name=${name} WHERE id=${productId}`,
      ).rejects.toBeDefined();
    for (const amount of [0, -1, 2147483648])
      await expect(
        client`UPDATE products SET amount=${amount} WHERE id=${productId}`,
      ).rejects.toBeDefined();
    await expect(
      client`UPDATE products SET currency='USD' WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE products SET revision=0 WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE products SET description=${"x".repeat(2001)} WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE products SET category_id=${randomUUID()} WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      client`UPDATE products SET category_id=NULL WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23502" });
  });
  it("categoria rejeita nome vazio/espaços e revisão inválida", async () => {
    for (const name of ["", " padded ", "\t"])
      await expect(
        client`UPDATE categories SET name=${name} WHERE id=${categoryId}`,
      ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client`UPDATE categories SET revision=0 WHERE id=${categoryId}`,
    ).rejects.toMatchObject({ code: "23514" });
  });
});
