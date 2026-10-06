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
import { createSession } from "@/features/auth/server/session";
import { addToCartAction } from "../actions/add-to-cart.action";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "../actions/cart-item.action";
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
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${productId},99)`;
});

beforeEach(async () => {
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`UPDATE products SET name='Cart fixture',amount=1099,image_key=null,is_published=true,category_id=${categoryId} WHERE id=${productId}`;
  await client`UPDATE inventory SET available_quantity=99 WHERE product_id=${productId}`;
  request.headers = new Headers({
    host: "localhost:3000",
    origin: "http://localhost:3000",
  });
  request.token = (await createSession(userId)).token;
});

afterAll(async () => {
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE category_id=${categoryId})`;
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
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    await expect(
      client`DELETE FROM products WHERE id=${productId}`,
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
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
    expect(await readCart()).toEqual({
      success: true,
      items: [],
      total: { amount: 0, currency: "BRL", formatted: "R$ 0,00" },
    });
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},2)`;
    expect(await readCart()).toEqual({
      success: true,
      items: [],
      total: { amount: 0, currency: "BRL", formatted: "R$ 0,00" },
    });
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
        "availableQuantity",
        "stockSufficient",
        "price",
        "image",
        "subtotal",
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

describe("ECMSG-57: adição server-authoritative", () => {
  it("autenticação, input estrito, publicação e autoridade forjada", async () => {
    request.token = undefined;
    expect(await addToCartAction({ productId, quantity: 1 })).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
    });
    request.token = (await createSession(userId)).token;
    for (const input of [
      { productId: "invalid", quantity: 1 },
      { productId, quantity: 0 },
      { productId, quantity: 100 },
      { productId, quantity: 1.5 },
      { productId, quantity: 1, price: 1 },
      { productId, quantity: 1, userId: otherId },
    ])
      expect(await addToCartAction(input)).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    expect(await addToCartAction({ productId, quantity: 1 }, "extra")).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    await client`UPDATE products SET is_published=false WHERE id=${productId}`;
    expect(await addToCartAction({ productId, quantity: 1 })).toEqual({
      success: false,
      code: "UNAVAILABLE",
    });
    expect(
      await addToCartAction({ productId: randomUUID(), quantity: 1 }),
    ).toEqual({ success: false, code: "UNAVAILABLE" });
    await client`UPDATE products SET is_published=true WHERE id=${productId}`;
  });
  it("UPSERT concorrente incrementa sem duplicação e respeita limite", async () => {
    expect(
      await Promise.all([
        addToCartAction({ productId, quantity: 1 }),
        addToCartAction({ productId, quantity: 1 }),
      ]),
    ).toEqual([{ success: true }, { success: true }]);
    const [row] =
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId} AND product_id=${productId}`;
    expect(row.quantity).toBe(2);
    expect(await addToCartAction({ productId, quantity: 97 })).toEqual({
      success: true,
    });
    expect(await addToCartAction({ productId, quantity: 1 })).toEqual({
      success: false,
      code: "LIMIT_REACHED",
    });
    await client`DELETE FROM cart_items WHERE user_id=${userId}`;
  });
});

describe("ECMSG-58: atualização e remoção", () => {
  it("ownership, quantidade explícita e item indisponível removível", async () => {
    request.token = (await createSession(userId)).token;
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},2)`;
    expect(await updateCartItemAction({ productId, quantity: 3 })).toEqual({
      success: false,
      code: "CONFLICT",
    });
    expect(await removeCartItemAction({ productId })).toEqual({
      success: true,
    });
    const [other] =
      await client`SELECT quantity FROM cart_items WHERE user_id=${otherId}`;
    expect(other.quantity).toBe(2);
    await addToCartAction({ productId, quantity: 1 });
    expect(await updateCartItemAction({ productId, quantity: 0 })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    await client`UPDATE products SET is_published=false WHERE id=${productId}`;
    expect(await updateCartItemAction({ productId, quantity: 2 })).toEqual({
      success: false,
      code: "UNAVAILABLE",
    });
    expect(await removeCartItemAction({ productId })).toEqual({
      success: true,
    });
    expect(await removeCartItemAction({ productId })).toEqual({
      success: true,
    });
    await client`UPDATE products SET is_published=true WHERE id=${productId}`;
    await client`DELETE FROM cart_items WHERE user_id=${otherId}`;
  });
  it("update/update, update/remove e remove/remove não recriam nem corrompem", async () => {
    await addToCartAction({ productId, quantity: 1 });
    expect(
      await Promise.all([
        updateCartItemAction({ productId, quantity: 5 }),
        updateCartItemAction({ productId, quantity: 6 }),
      ]),
    ).toEqual([{ success: true }, { success: true }]);
    const [row] =
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`;
    expect([5, 6]).toContain(row.quantity);
    const pair = await Promise.all([
      updateCartItemAction({ productId, quantity: 7 }),
      removeCartItemAction({ productId }),
    ]);
    expect(pair[1]).toEqual({ success: true });
    expect(
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      await Promise.all([
        removeCartItemAction({ productId }),
        removeCartItemAction({ productId }),
      ]),
    ).toEqual([{ success: true }, { success: true }]);
  });
});

describe("ECMSG-61: intenção do catálogo", () => {
  it("produto renderizado público não autoriza add após despublicação", async () => {
    request.token = (await createSession(userId)).token;
    const { readProduct } = await import(
      "@/features/catalog/server/read-product"
    );
    const rendered = await readProduct(productId);
    expect(rendered).not.toBeNull();
    await client`UPDATE products SET is_published=false WHERE id=${productId}`;
    expect(await addToCartAction({ productId, quantity: 1 })).toEqual({
      success: false,
      code: "UNAVAILABLE",
    });
    expect(
      await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(0);
    await client`UPDATE products SET is_published=true WHERE id=${productId}`;
  });
});

async function waitForProductLock() {
  for (let i = 0; i < 100; i++) {
    const [row] =
      await client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%"products"%'`;
    if (row.count > 0) return;
    await new Promise((done) => setTimeout(done, 20));
  }
  throw new Error("Mutation did not reach product lock");
}

describe("ECMSG-62: catálogo atual e races", () => {
  it("relê preço/nome/imagem/categoria, mantém despublicado removível", async () => {
    request.token = (await createSession(userId)).token;
    await addToCartAction({ productId, quantity: 2 });
    const [category] =
      await client`INSERT INTO categories(name) VALUES (${`Moved ${suffix}`}) RETURNING id`;
    try {
      await client`UPDATE products SET name='New cart name',amount=1201,image_key='shield',category_id=${category.id} WHERE id=${productId}`;
      expect(await readCart()).toMatchObject({
        success: true,
        items: [
          {
            name: "New cart name",
            price: { amount: 1201 },
            image: { key: "shield" },
            subtotal: { amount: 2402 },
          },
        ],
        total: { amount: 2402 },
      });
      await client`UPDATE products SET is_published=false WHERE id=${productId}`;
      expect(await readCart()).toMatchObject({
        success: true,
        items: [{ available: false, subtotal: null }],
        total: { amount: 0 },
      });
      expect(await updateCartItemAction({ productId, quantity: 1 })).toEqual({
        success: false,
        code: "UNAVAILABLE",
      });
      expect(await removeCartItemAction({ productId })).toEqual({
        success: true,
      });
    } finally {
      await client`UPDATE products SET name='Cart fixture',amount=1099,image_key=null,is_published=true,category_id=${categoryId} WHERE id=${productId}`;
      await client`DELETE FROM categories WHERE id=${category.id}`;
    }
  });
  it("add/update revalidam publicação depois do lock; read snapshot e remove continuam seguros", async () => {
    const blocker = postgres(value, { max: 1, onnotice: () => {} });
    try {
      for (const operation of ["add", "update"] as const) {
        await client`UPDATE products SET is_published=true WHERE id=${productId}`;
        await addToCartAction({ productId, quantity: 1 });
        let locked!: () => void;
        let unlock!: () => void;
        const acquired = new Promise<void>((done) => {
          locked = done;
        });
        const release = new Promise<void>((done) => {
          unlock = done;
        });
        const holding = blocker.begin(async (tx) => {
          await tx`UPDATE products SET is_published=false WHERE id=${productId}`;
          locked();
          await release;
        });
        try {
          await acquired;
          // Uncommitted change is not a new authoritative catalogue snapshot.
          expect(await readCart()).toMatchObject({
            success: true,
            items: [{ available: true }],
          });
          const pending =
            operation === "add"
              ? addToCartAction({ productId, quantity: 1 })
              : updateCartItemAction({ productId, quantity: 2 });
          await waitForProductLock();
          unlock();
          await holding;
          expect(await pending).toEqual({
            success: false,
            code: "UNAVAILABLE",
          });
          expect(await readCart()).toMatchObject({
            success: true,
            items: [{ quantity: 1, available: false }],
            total: { amount: 0 },
          });
          expect(await removeCartItemAction({ productId })).toEqual({
            success: true,
          });
        } finally {
          unlock();
          await holding;
        }
      }
      await client`UPDATE products SET is_published=true WHERE id=${productId}`;
      await addToCartAction({ productId, quantity: 1 });
      await blocker.begin(async (tx) => {
        await tx`UPDATE products SET amount=1500 WHERE id=${productId}`;
        expect(await removeCartItemAction({ productId })).toEqual({
          success: true,
        });
      });
    } finally {
      await blocker.end();
      await client`UPDATE products SET amount=1099,is_published=true WHERE id=${productId}`;
    }
  });
});

describe("ECMSG-63: boundaries, ownership e sessão concorrente", () => {
  it("todas as Actions negam Origin ausente/forjado e payload extra", async () => {
    request.token = (await createSession(userId)).token;
    for (const action of [
      addToCartAction,
      updateCartItemAction,
      removeCartItemAction,
    ]) {
      for (const origin of ["", "null", "https://evil.test"]) {
        request.headers = new Headers({
          host: "localhost:3000",
          origin,
          "x-forwarded-host": "evil.test",
        });
        await expect(action({ productId, quantity: 1 })).rejects.toThrow(
          "Requisição inválida.",
        );
      }
      request.headers = new Headers({
        host: "localhost:3000",
        origin: "http://localhost:3000",
      });
      expect(await action({ productId, quantity: 1, userId: otherId })).toEqual(
        { success: false, code: "INVALID_INPUT" },
      );
      expect(await action({ productId }, "extra")).toEqual({
        success: false,
        code: "INVALID_INPUT",
      });
    }
    expect(
      await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(0);
  });
  it("revogação durante espera da identidade e reads revogados negam acesso", async () => {
    request.token = (await createSession(userId)).token;
    const { revokeSession } = await import("@/features/auth/server/session");
    const blocker = postgres(value, { max: 1, onnotice: () => {} });
    let unlock!: () => void;
    let locked!: () => void;
    const release = new Promise<void>((done) => {
      unlock = done;
    });
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
      const pending = addToCartAction({ productId, quantity: 1 });
      for (let i = 0; i < 100; i++) {
        const [row] =
          await client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%"users"%'`;
        if (row.count) break;
        if (i === 99) throw new Error("No identity wait");
        await new Promise((done) => setTimeout(done, 20));
      }
      await revokeSession(request.token);
      unlock();
      await holding;
      expect(await pending).toEqual({
        success: false,
        code: "UNAUTHENTICATED",
      });
      expect(await readCart()).toEqual({
        success: false,
        code: "UNAUTHENTICATED",
      });
      expect(
        await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
      ).toHaveLength(0);
    } finally {
      unlock();
      await holding;
      await blocker.end();
    }
  });
  it("expiração absoluta/idle durante lock desfaz add/update/remove", async () => {
    const blocker = postgres(value, { max: 1, onnotice: () => {} });
    try {
      for (const operation of ["add", "update", "remove"] as const)
        for (const expiry of ["absolute", "idle"] as const) {
          request.token = (await createSession(userId)).token;
          await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2) ON CONFLICT (user_id,product_id) DO UPDATE SET quantity=2`;
          const { tokenHash } = await import("@/features/auth/server/session");
          const hash = tokenHash(request.token);
          if (expiry === "absolute")
            await client`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 second' WHERE token_hash=${hash}`;
          else
            await client`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',last_active_at=clock_timestamp()-interval '29 minutes 59 seconds' WHERE token_hash=${hash}`;
          let unlock!: () => void;
          let locked!: () => void;
          const release = new Promise<void>((done) => {
            unlock = done;
          });
          const acquired = new Promise<void>((done) => {
            locked = done;
          });
          const holding = blocker.begin(async (tx) => {
            if (operation === "remove")
              await tx`SELECT quantity FROM cart_items WHERE user_id=${userId} AND product_id=${productId} FOR UPDATE`;
            else
              await tx`SELECT id FROM products WHERE id=${productId} FOR UPDATE`;
            locked();
            await release;
          });
          try {
            await acquired;
            const pending =
              operation === "add"
                ? addToCartAction({ productId, quantity: 1 })
                : operation === "update"
                  ? updateCartItemAction({ productId, quantity: 3 })
                  : removeCartItemAction({ productId });
            if (operation !== "remove") await waitForProductLock();
            else {
              let waiting = false;
              for (let i = 0; i < 100 && !waiting; i++) {
                const [row] =
                  await client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%"cart_items"%'`;
                waiting = !!row.count;
                if (!waiting) await new Promise((done) => setTimeout(done, 20));
              }
              expect(waiting).toBe(true);
            }
            await client`SELECT pg_sleep(1.1)`;
            unlock();
            await holding;
            expect(await pending).toEqual({
              success: false,
              code: "UNAUTHENTICATED",
            });
            const [stored] =
              await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`;
            expect(stored.quantity).toBe(2);
          } finally {
            unlock();
            await holding;
          }
        }
    } finally {
      await blocker.end();
      await client`DELETE FROM cart_items WHERE user_id=${userId}`;
    }
  });
});

describe("ECMSG-64: matriz de segurança adicional", () => {
  it("A e B leem somente próprios itens, update/remove não operam item de B", async () => {
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},9)`;
    request.token = (await createSession(otherId)).token;
    expect(await readCart()).toMatchObject({
      success: true,
      items: [{ quantity: 9 }],
      total: { amount: 9891 },
    });
    request.token = (await createSession(userId)).token;
    expect(await readCart()).toMatchObject({ success: true, items: [] });
    expect(await updateCartItemAction({ productId, quantity: 2 })).toEqual({
      success: false,
      code: "CONFLICT",
    });
    await removeCartItemAction({ productId });
    expect(
      (
        await client`SELECT quantity FROM cart_items WHERE user_id=${otherId}`
      )[0].quantity,
    ).toBe(9);
    await client`DELETE FROM cart_items WHERE user_id=${otherId}`;
  });
  it("limite de 100 produtos é serializado mesmo para adições diferentes concorrentes", async () => {
    request.token = (await createSession(userId)).token;
    const fixture =
      await client`INSERT INTO products(name,category_id,amount,is_published) SELECT 'Cart bound',${categoryId},1,true FROM generate_series(1,101) RETURNING id`;
    try {
      for (const product of fixture)
        await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},99)`;
      for (const product of fixture.slice(0, 99))
        await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${product.id})`;
      const results = await Promise.all(
        fixture
          .slice(99)
          .map((p) => addToCartAction({ productId: p.id, quantity: 1 })),
      );
      expect(results.filter((r) => r.success)).toHaveLength(1);
      expect(results.filter((r) => !r.success)).toEqual([
        { success: false, code: "LIMIT_REACHED" },
      ]);
      expect(
        (
          await client`SELECT count(*)::int AS count FROM cart_items WHERE user_id=${userId}`
        )[0].count,
      ).toBe(100);
    } finally {
      await client`DELETE FROM cart_items WHERE user_id=${userId}`;
      await client`DELETE FROM inventory WHERE product_id IN ${client(fixture.map((p) => p.id))}`;
      await client`DELETE FROM products WHERE id IN ${client(fixture.map((p) => p.id))}`;
    }
  });
  it("falha inesperada permanece exception sanitizada sem cause/payload em logs", async () => {
    request.token = (await createSession(userId)).token;
    const logging = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = vi
      .spyOn(getDb(), "transaction")
      .mockRejectedValueOnce(
        new Error("DATABASE_URL=private; SQL SELECT; token=private"),
      );
    try {
      const error = await addToCartAction({ productId, quantity: 1 }).catch(
        (error) => error,
      );
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        "Não foi possível concluir a operação do carrinho.",
      );
      expect(error).not.toHaveProperty("cause");
      const output = JSON.stringify(logging.mock.calls);
      expect(output).not.toMatch(/DATABASE_URL|SELECT|token|private/);
      expect(logging).toHaveBeenCalledTimes(1);
    } finally {
      failure.mockRestore();
      logging.mockRestore();
    }
  });
});

it("ECMSG-64: visitante não atualiza/remove; replay e concorrência no limite", async () => {
  request.token = undefined;
  expect(await updateCartItemAction({ productId, quantity: 2 })).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  expect(await removeCartItemAction({ productId })).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  request.token = (await createSession(userId)).token;
  await addToCartAction({ productId, quantity: 95 });
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      addToCartAction({ productId, quantity: 1 }),
    ),
  );
  expect(results.filter((r) => r.success)).toHaveLength(4);
  expect(
    (await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`)[0]
      .quantity,
  ).toBe(99);
  for (let i = 0; i < 2; i++)
    expect(await updateCartItemAction({ productId, quantity: 3 })).toEqual({
      success: true,
    });
  expect(
    (await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`)[0]
      .quantity,
  ).toBe(3);
  for (let i = 0; i < 2; i++)
    expect(await removeCartItemAction({ productId })).toEqual({
      success: true,
    });
});

it("ECMSG-83: estoque limita quantidade resultante e não reserva", async () => {
  await client`UPDATE inventory SET available_quantity=5 WHERE product_id=${productId}`;
  expect(await addToCartAction({ productId, quantity: 3 })).toEqual({
    success: true,
  });
  expect(await addToCartAction({ productId, quantity: 3 })).toEqual({
    success: false,
    code: "OUT_OF_STOCK",
  });
  expect(await addToCartAction({ productId, quantity: 2 })).toEqual({
    success: true,
  });
  expect(await updateCartItemAction({ productId, quantity: 6 })).toEqual({
    success: false,
    code: "OUT_OF_STOCK",
  });
  expect(
    (
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
    )[0].available_quantity,
  ).toBe(5);
  await client`UPDATE inventory SET available_quantity=2 WHERE product_id=${productId}`;
  expect(await readCart()).toMatchObject({
    success: true,
    items: [
      {
        quantity: 5,
        available: true,
        stockSufficient: false,
        availableQuantity: 2,
        subtotal: null,
      },
    ],
    total: { amount: 0 },
  });
  expect(await removeCartItemAction({ productId })).toEqual({ success: true });
});
it("ECMSG-90: estoque/revisão forjados não autorizam add/update", async () => {
  for (const key of [
    "availableQuantity",
    "inStock",
    "inventoryRevision",
    "revision",
  ]) {
    expect(
      await addToCartAction({ productId, quantity: 1, [key]: 99 }),
    ).toEqual({ success: false, code: "INVALID_INPUT" });
    expect(
      await updateCartItemAction({ productId, quantity: 1, [key]: 99 }),
    ).toEqual({ success: false, code: "INVALID_INPUT" });
  }
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  expect(await addToCartAction({ productId, quantity: 1 })).toEqual({
    success: false,
    code: "OUT_OF_STOCK",
  });
  await client`INSERT INTO inventory(product_id) VALUES (${productId})`;
});
