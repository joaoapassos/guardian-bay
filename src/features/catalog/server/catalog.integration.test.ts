import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession, revokeSession } from "@/features/auth/server/session";
import { manageCatalogAction } from "../actions/manage-catalog.action";
import { listProducts } from "./list-products";
import { manageCatalog } from "./manage-catalog";
import { readAdminCatalog } from "./read-admin-catalog";
import { readProduct } from "./read-product";

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
  await client`DELETE FROM users WHERE id=${userId}`;
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

describe("operações administrativas reais (ECMSG-49)", () => {
  it("nega chamadas diretas sem autorização, permite admin e impede lost update", async () => {
    const fields = {
      operation: "create-product",
      name: "Admin fixture",
      description: "Texto <script>não executável</script>",
      categoryId,
      amount: 1099,
      currency: "BRL",
      isPublished: true,
    };
    request.token = undefined;
    expect(await manageCatalogAction(fields)).toEqual({
      success: false,
      code: "FORBIDDEN",
    });
    expect(await readAdminCatalog({})).toBeNull();
    request.token = (await createSession(userId)).token;
    expect(await manageCatalog(fields)).toEqual({
      success: false,
      code: "FORBIDDEN",
    });
    expect(await manageCatalogAction({ ...fields, role: "admin" })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    await client`UPDATE users SET role='admin' WHERE id=${userId}`;
    expect(await manageCatalogAction(fields, "extra argument")).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(await manageCatalogAction(fields)).toEqual({ success: true });
    const [created] =
      await client`SELECT id,revision FROM products WHERE name='Admin fixture' AND category_id=${categoryId}`;
    const update = {
      ...fields,
      operation: "update-product",
      id: created.id,
      revision: created.revision,
    };
    const results = await Promise.all([
      manageCatalog({ ...update, amount: 1200 }),
      manageCatalog({ ...update, amount: 1300 }),
    ]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success)).toEqual([
      { success: false, code: "CONFLICT" },
    ]);
    const [changed] =
      await client`SELECT amount,revision FROM products WHERE id=${created.id}`;
    expect([1200, 1300]).toContain(changed.amount);
    expect(changed.revision).toBe(2);
    expect(
      await manageCatalog({ ...update, revision: 2, isPublished: false }),
    ).toEqual({ success: true });
    expect(await readProduct(created.id)).toBeNull();
    expect(await readAdminCatalog({})).toMatchObject({ page: 1 });
    await revokeSession(request.token);
    expect(await manageCatalog({ ...update, revision: 3 })).toEqual({
      success: false,
      code: "FORBIDDEN",
    });
    expect(await readAdminCatalog({})).toBeNull();
    request.token = undefined;
  });
  it("rejeita preço, campos de autoridade e nomes inválidos antes de persistência", async () => {
    const fields = {
      operation: "create-product",
      name: "Invalid fixture",
      description: "",
      categoryId,
      amount: 100,
      currency: "BRL",
      isPublished: false,
    };
    for (const invalid of [
      { amount: -1 },
      { amount: 10.99 },
      { amount: "1099" },
      { amount: 2147483648 },
      { currency: "USD" },
      { role: "admin" },
      { userId },
      { price: "R$ 1" },
      { name: " " },
    ])
      expect(await manageCatalog({ ...fields, ...invalid })).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    expect(
      await client`SELECT id FROM products WHERE name='Invalid fixture' AND category_id=${categoryId}`,
    ).toHaveLength(0);
  });
  it("cria/edita categoria sem delete, conflito controlado e sem erro SQL público", async () => {
    request.token = (await createSession(userId)).token;
    const name = `Admin category ${suffix}`;
    try {
      expect(
        await manageCatalog({ operation: "create-category", name }),
      ).toEqual({ success: true });
      const [category] =
        await client`SELECT id,revision FROM categories WHERE name=${name}`;
      expect(
        await manageCatalog({
          operation: "update-category",
          ...category,
          name: `Changed ${suffix}`,
        }),
      ).toEqual({ success: true });
      expect(
        await manageCatalog({
          operation: "update-category",
          ...category,
          name,
        }),
      ).toEqual({ success: false, code: "CONFLICT" });
      const logging = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(
          await manageCatalog({
            operation: "create-category",
            name: `Fixture ${suffix}`,
          }),
        ).toEqual({ success: false, code: "OPERATION_FAILED" });
        const event = JSON.parse(String(logging.mock.calls[0][0]));
        expect(Object.keys(event)).toEqual([
          "timestamp",
          "event",
          "operation",
          "result",
          "correlationId",
        ]);
        expect(JSON.stringify(event)).not.toContain(name);
      } finally {
        logging.mockRestore();
      }
    } finally {
      await client`DELETE FROM categories WHERE name IN (${name},${`Changed ${suffix}`})`;
      request.token = undefined;
    }
  });
});
