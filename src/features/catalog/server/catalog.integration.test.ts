import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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
beforeEach(async () => {
  await client`DELETE FROM abuse_budgets WHERE user_id=${userId}`;
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
      ).toEqual(["id", "name", "category", "inStock", "price", "image"]);
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
  await client`DELETE FROM abuse_budgets WHERE user_id=${userId}`;
  await client`DELETE FROM audit_events WHERE actor_user_id IN (SELECT id FROM users WHERE id=${userId})`;
  await client`DELETE FROM users WHERE id=${userId}`;
  await client`DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE category_id=${categoryId})`;
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
    await expect(
      client`UPDATE products SET image_key='../../secret' WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: "23514" });
    await client`UPDATE products SET image_key='lock' WHERE id=${productId}`;
    const [image] =
      await client`SELECT image_key FROM products WHERE id=${productId}`;
    expect(image.image_key).toBe("lock");
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
    expect(
      (
        await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${created.id}`
      )[0],
    ).toEqual({ available_quantity: 0, revision: 1 });
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

describe("revisão concorrente de segurança (ECMSG-51)", () => {
  it("rollback se a sessão expirar durante espera pelo produto", async () => {
    const session = await createSession(userId);
    request.token = session.token;
    const [product] =
      await client`INSERT INTO products(name,category_id,amount) VALUES ('Concurrent security',${categoryId},1099) RETURNING id`;
    const blocker = postgres(value, { max: 1, onnotice: () => {} });
    const logging = vi.spyOn(console, "warn").mockImplementation(() => {});
    let unlock!: () => void;
    const release = new Promise<void>((done) => {
      unlock = done;
    });
    let locked!: () => void;
    const acquired = new Promise<void>((done) => {
      locked = done;
    });
    const holding = blocker.begin(async (tx) => {
      await tx`SELECT id FROM products WHERE id=${product.id} FOR UPDATE`;
      locked();
      await release;
    });
    try {
      await acquired;
      await client`UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE user_id=${userId}`;
      const pending = manageCatalog({
        operation: "update-product",
        id: product.id,
        revision: 1,
        name: "Unauthorized expired update",
        description: "",
        categoryId,
        amount: 1200,
        currency: "BRL",
        isPublished: true,
      });
      await new Promise((done) => setTimeout(done, 1200));
      unlock();
      await holding;
      expect(await pending).toEqual({
        success: false,
        code: "OPERATION_FAILED",
      });
      const [stored] =
        await client`SELECT name,amount,revision,is_published FROM products WHERE id=${product.id}`;
      expect(stored).toMatchObject({
        name: "Concurrent security",
        amount: 1099,
        revision: 1,
        is_published: false,
      });
    } finally {
      unlock();
      await holding;
      await blocker.end();
      logging.mockRestore();
      request.token = undefined;
    }
  });
  it("não autoriza sessão revogada enquanto a identidade está bloqueada", async () => {
    request.token = (await createSession(userId)).token;
    const blocker = postgres(value, { max: 1, onnotice: () => {} });
    let unlock!: () => void;
    const release = new Promise<void>((done) => {
      unlock = done;
    });
    let locked!: () => void;
    const acquired = new Promise<void>((done) => {
      locked = done;
    });
    const holding = blocker.begin(async (tx) => {
      await tx`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
      locked();
      await release;
    });
    try {
      await acquired;
      const pending = manageCatalog({
        operation: "create-category",
        name: `Revoked ${suffix}`,
      });
      // Wait for an actual lock wait, not an assumed scheduling order.
      let waiting = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const [row] =
          await client`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`;
        if (row.count > 0) {
          waiting = true;
          break;
        }
        await new Promise((done) => setTimeout(done, 10));
      }
      expect(waiting).toBe(true);
      await revokeSession(request.token);
      unlock();
      await holding;
      expect(await pending).toEqual({ success: false, code: "FORBIDDEN" });
      expect(
        await client`SELECT id FROM categories WHERE name=${`Revoked ${suffix}`}`,
      ).toHaveLength(0);
    } finally {
      unlock();
      await holding;
      await blocker.end();
      request.token = undefined;
    }
  });
});

describe("navegação pública com PostgreSQL real (ECMSG-52)", () => {
  it("ordena, pagina com desempate estável e impede exposição de não publicados", async () => {
    const prefix = `Sort ${suffix}`;
    for (const [name, amount, published] of [
      [`${prefix} A`, 200, true],
      [`${prefix} B`, 100, true],
      [`${prefix} C`, 100, true],
      [`${prefix} hidden`, 1, false],
      [`Literal %_${suffix}`, 300, true],
    ] as const)
      await client`INSERT INTO products(name,category_id,amount,is_published) VALUES (${name},${categoryId},${amount},${published})`;
    const first = await listProducts({
      query: prefix,
      category: categoryId,
      sort: "price-asc",
      limit: "2",
    });
    const next = await listProducts({
      query: prefix,
      category: categoryId,
      sort: "price-asc",
      limit: "2",
      page: "2",
    });
    expect(first.success && next.success).toBe(true);
    if (!first.success || !next.success) throw new Error("Listagem inválida");
    expect(first.products.map((p) => p.price.amount)).toEqual([100, 100]);
    expect(first.hasNext).toBe(true);
    expect(next.products.map((p) => p.price.amount)).toEqual([200]);
    expect(next.hasNext).toBe(false);
    expect(
      new Set([...first.products, ...next.products].map((p) => p.id)).size,
    ).toBe(3);
    const descending = await listProducts({
      query: prefix,
      category: categoryId,
      sort: "price-desc",
    });
    expect(
      descending.success && descending.products.map((p) => p.price.amount),
    ).toEqual([200, 100, 100]);
    const alphabetical = await listProducts({
      query: prefix,
      category: categoryId,
      sort: "name",
    });
    expect(
      alphabetical.success && alphabetical.products.map((p) => p.name),
    ).toEqual([`${prefix} A`, `${prefix} B`, `${prefix} C`]);
    const literal = await listProducts({ query: "%_", category: categoryId });
    expect(literal.success && literal.products.map((p) => p.name)).toEqual([
      `Literal %_${suffix}`,
    ]);
  });
});

it("ECMSG-93: guard administrativo consulta role atual, sem autoridade do layout", async () => {
  const { requireAuthenticatedAdmin } = await import(
    "@/features/auth/server/require-admin"
  );
  request.token = undefined;
  expect((await requireAuthenticatedAdmin()).success).toBe(false);
  await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  request.token = (await createSession(userId)).token;
  expect((await requireAuthenticatedAdmin()).success).toBe(false);
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  expect((await requireAuthenticatedAdmin()).success).toBe(true);
  await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  expect((await requireAuthenticatedAdmin()).success).toBe(false);
});

it("ECMSG-100: busca administrativa literal e filtros limitados", async () => {
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  request.token = (await createSession(userId)).token;
  for (const query of ["%", "_", "' OR 1=1 --"]) {
    const result = await readAdminCatalog({ query, category: categoryId });
    expect(result).not.toBeNull();
    expect(
      result?.products.every((product) => product.name.includes(query)),
    ).toBe(true);
  }
  for (const input of [
    { query: "a".repeat(101) },
    { page: "1001" },
    { publication: "all OR true" },
    { sort: "raw" },
  ])
    expect(await readAdminCatalog(input)).toBeNull();
});

it("ECMSG-109: mutation e audit atômicos; conflito não gera sucesso", async () => {
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  request.token = (await createSession(userId)).token;
  const [category] =
    await client`SELECT revision FROM categories WHERE id=${categoryId}`;
  const input = {
    operation: "update-category",
    id: categoryId,
    revision: category.revision,
    name: `Audit ${suffix}`,
  };
  const before = (
    await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${userId}`
  )[0].count;
  expect(await manageCatalog(input)).toEqual({ success: true });
  expect(await manageCatalog(input)).toMatchObject({ code: "CONFLICT" });
  expect(
    (
      await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${userId}`
    )[0].count,
  ).toBe(before + 1);
  expect(
    (
      await client`SELECT target_id,event_type FROM audit_events WHERE actor_user_id=${userId} ORDER BY occurred_at DESC LIMIT 1`
    )[0],
  ).toEqual({ target_id: categoryId, event_type: "admin.category.updated" });
  const writer = await import("@/lib/audit/server");
  const spy = vi
    .spyOn(writer, "writeAuditEvent")
    .mockRejectedValueOnce(new Error("Synthetic audit failure"));
  try {
    expect(
      await manageCatalog({
        ...input,
        revision: category.revision + 1,
        name: "Should rollback",
      }),
    ).toMatchObject({ code: "OPERATION_FAILED" });
  } finally {
    spy.mockRestore();
  }
  expect(
    (
      await client`SELECT name,revision FROM categories WHERE id=${categoryId}`
    )[0],
  ).toEqual({ name: input.name, revision: category.revision + 1 });
});
