import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";

vi.mock("server-only", () => ({}));
const requestContext = await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  return new AsyncLocalStorage<{ token: string }>();
});
const request = vi.hoisted(() => ({
  token: undefined as string | undefined,
  headers: new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => {
    const token = requestContext.getStore()?.token ?? request.token;
    return { get: () => (token ? { value: token } : undefined) };
  },
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
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${productId},99)`;
});
beforeEach(async () => {
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM audit_events WHERE actor_user_id IN (${userId},${otherId})`;
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
  await client`UPDATE products SET name='Order fixture',amount=1099,is_published=true WHERE id=${productId}`;
  await client`UPDATE inventory SET available_quantity=99,revision=1 WHERE product_id=${productId}`;
  request.token = (await createSession(userId)).token;
  request.headers = new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  });
});
afterAll(async () => {
  await client`DELETE FROM abuse_budgets WHERE user_id=ANY(ARRAY[${userId}::uuid,${otherId}::uuid])`;
  await client`DELETE FROM audit_events WHERE actor_user_id IN (${userId},${otherId})`;
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
it("ECMSG-72: sucesso remove convertidos; replay antigo preserva adição nova e recusa preserva carrinho", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  const checkoutKey = randomUUID();
  const paid = await checkoutAction({ checkoutKey });
  expect(paid).toMatchObject({ success: true, status: "PAID" });
  expect(
    await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(0);
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},3)`;
  expect(await checkoutAction({ checkoutKey })).toEqual(paid);
  expect(
    (await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`)[0]
      .quantity,
  ).toBe(3);
  await client`UPDATE products SET amount=1000000 WHERE id=${productId}`;
  expect(await checkoutAction({ checkoutKey: randomUUID() })).toMatchObject({
    success: true,
    status: "PAYMENT_FAILED",
  });
  expect(
    (await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`)[0]
      .quantity,
  ).toBe(3);
});
it("ECMSG-72: falha ao persistir itens reverte pedido e preserva carrinho", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  // Dedicated test DB only; temporary trigger forces a real mid-transaction fault.
  await client`CREATE FUNCTION test_order_item_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$`;
  await client`CREATE TRIGGER test_order_item_failure BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION test_order_item_failure()`;
  try {
    await expect(checkoutAction({ checkoutKey: randomUUID() })).rejects.toThrow(
      "Não foi possível concluir o checkout.",
    );
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(1);
  } finally {
    await client`DROP TRIGGER test_order_item_failure ON order_items`;
    await client`DROP FUNCTION test_order_item_failure()`;
    warn.mockRestore();
  }
});
it("ECMSG-74: histórico privado, DTO mínimo e paginação limitada", async () => {
  const { orderHistory } = await import("./order-history");
  request.token = undefined;
  expect(await orderHistory()).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  request.token = (await createSession(userId)).token;
  expect(await orderHistory()).toMatchObject({ success: true, orders: [] });
  await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) SELECT ${otherId},gen_random_uuid(),1,'PAID' FROM generate_series(1,2)`;
  await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) SELECT ${userId},gen_random_uuid(),1,'PAID' FROM generate_series(1,21)`;
  const result = await orderHistory();
  expect(result).toMatchObject({ success: true, hasNext: true });
  if (result.success) {
    expect(result.orders).toHaveLength(20);
    expect(Object.keys(result.orders[0])).toEqual([
      "orderId",
      "createdAt",
      "status",
      "total",
    ]);
  }
  expect(await orderHistory({ page: 2 })).toMatchObject({
    success: true,
    hasNext: false,
    orders: [expect.anything()],
  });
  expect(await orderHistory({ page: 1001 })).toEqual({
    success: false,
    code: "INVALID_INPUT",
  });
  expect(await orderHistory({ userId: otherId })).toEqual({
    success: false,
    code: "INVALID_INPUT",
  });
});
it("ECMSG-75: detalhes usam snapshot, ownership na query e DTO mínimo", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { orderDetail } = await import("./order-detail");
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  const created = await checkoutAction({ checkoutKey: randomUUID() });
  if (!created.success) throw new Error("Fixture checkout failed");
  const before = await orderDetail(created.orderId);
  expect(before).toMatchObject({
    success: true,
    order: {
      total: { amount: 2198 },
      items: [{ productName: "Order fixture", price: { amount: 1099 } }],
    },
  });
  await client`UPDATE products SET name='Later name',amount=9999,is_published=false WHERE id=${productId}`;
  expect(await orderDetail(created.orderId)).toEqual(before);
  if (before.success) {
    expect(Object.keys(before.order)).toEqual([
      "orderId",
      "status",
      "createdAt",
      "total",
      "items",
    ]);
    expect(Object.keys(before.order.items[0])).toEqual([
      "productName",
      "quantity",
      "price",
      "subtotal",
    ]);
  }
  request.token = (await createSession(otherId)).token;
  expect(await orderDetail(created.orderId)).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
  expect(await orderDetail(randomUUID())).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
  expect(await orderDetail("' OR 1=1 --")).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
});

async function waitForOrderLock(
  table: "products" | "users" | "inventory",
  minimum = 1,
) {
  for (let i = 0; i < 100; i++) {
    const [row] =
      await client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE ${`%"${table}"%`}`;
    if (row.count >= minimum) return;
    await new Promise((done) => setTimeout(done, 20));
  }
  throw new Error("Checkout did not reach expected lock");
}
async function holdOrderLock(
  action: (tx: postgres.TransactionSql) => Promise<unknown>,
) {
  const blocker = postgres(url.href, { max: 1, onnotice: () => {} });
  let acquired!: () => void;
  let release!: () => void;
  const locked = new Promise<void>((done) => {
    acquired = done;
  });
  const unlock = new Promise<void>((done) => {
    release = done;
  });
  const holding = blocker.begin(async (tx) => {
    await action(tx);
    acquired();
    await unlock;
  });
  await locked;
  return {
    release: async () => {
      release();
      await holding;
      await blocker.end();
    },
  };
}

it("ECMSG-76: Origin/contrato, visitante e mass assignment antes de mutation", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const input = { checkoutKey: randomUUID() };
  request.token = undefined;
  expect(await checkoutAction(input)).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
  request.token = (await createSession(userId)).token;
  for (const key of [
    "availableQuantity",
    "inStock",
    "inventoryRevision",
    "revision",
    "userId",
    "items",
    "unitPrice",
    "amount",
    "subtotal",
    "total",
    "currency",
    "status",
    "paymentStatus",
    "role",
  ])
    expect(await checkoutAction({ ...input, [key]: 1 })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
  expect(await checkoutAction(input, "extra")).toEqual({
    success: false,
    code: "INVALID_INPUT",
  });
  request.headers = new Headers({
    host: "localhost:3000",
    origin: "https://attacker.test",
  });
  await expect(checkoutAction(input)).rejects.toThrow("Requisição inválida.");
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
});
it("ECMSG-76: catálogo alterado durante espera é relido sob lock", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const lock = await holdOrderLock(
    (tx) => tx`UPDATE products SET amount=1234 WHERE id=${productId}`,
  );
  try {
    const pending = checkoutAction({ checkoutKey: randomUUID() });
    await waitForOrderLock("products");
    await lock.release();
    expect(await pending).toMatchObject({ success: true, status: "PAID" });
    expect(
      (await client`SELECT total_amount FROM orders WHERE user_id=${userId}`)[0]
        .total_amount,
    ).toBe("1234");
  } finally {
    await lock.release();
  }
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const unpublished = await holdOrderLock(
    (tx) => tx`UPDATE products SET is_published=false WHERE id=${productId}`,
  );
  try {
    const pending = checkoutAction({ checkoutKey: randomUUID() });
    await waitForOrderLock("products");
    await unpublished.release();
    expect(await pending).toEqual({ success: false, code: "UNAVAILABLE" });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(1);
    expect(
      await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(1);
  } finally {
    await unpublished.release();
  }
});
it("ECMSG-76: expiração absoluta/idle durante lock causa rollback", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { tokenHash } = await import("@/features/auth/server/session");
  for (const kind of ["absolute", "idle"] as const) {
    request.token = (await createSession(userId)).token;
    const hash = tokenHash(request.token);
    if (kind === "absolute")
      await client`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 second' WHERE token_hash=${hash}`;
    else
      await client`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',last_active_at=clock_timestamp()-interval '29 minutes 59 seconds' WHERE token_hash=${hash}`;
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId}) ON CONFLICT DO NOTHING`;
    const lock = await holdOrderLock(
      (tx) => tx`SELECT id FROM products WHERE id=${productId} FOR UPDATE`,
    );
    try {
      const pending = checkoutAction({ checkoutKey: randomUUID() });
      await waitForOrderLock("products");
      await client`SELECT pg_sleep(1.1)`;
      await lock.release();
      expect(await pending).toEqual({
        success: false,
        code: "UNAUTHENTICATED",
      });
      expect(
        await client`SELECT id FROM orders WHERE user_id=${userId}`,
      ).toHaveLength(0);
      expect(
        await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
      ).toHaveLength(1);
    } finally {
      await lock.release();
    }
  }
});
it("ECMSG-76: revogação antes da autorização bloqueada nega pedido", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { tokenHash } = await import("@/features/auth/server/session");
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const lock = await holdOrderLock(
    (tx) => tx`SELECT id FROM users WHERE id=${userId} FOR UPDATE`,
  );
  try {
    const pending = checkoutAction({ checkoutKey: randomUUID() });
    await waitForOrderLock("users");
    await client`DELETE FROM sessions WHERE token_hash=${tokenHash(request.token)}`;
    await lock.release();
    expect(await pending).toEqual({ success: false, code: "UNAUTHENTICATED" });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
  } finally {
    await lock.release();
  }
});
it("ECMSG-76: checkout serializa add/update/remove sem misturar snapshots", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { addToCartAction } = await import(
    "@/features/cart/actions/add-to-cart.action"
  );
  const { updateCartItemAction, removeCartItemAction } = await import(
    "@/features/cart/actions/cart-item.action"
  );
  for (const operation of ["add", "update", "remove"] as const) {
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2) ON CONFLICT (user_id,product_id) DO UPDATE SET quantity=2`;
    const lock = await holdOrderLock(
      (tx) => tx`SELECT id FROM products WHERE id=${productId} FOR UPDATE`,
    );
    try {
      const pending = checkoutAction({ checkoutKey: randomUUID() });
      await waitForOrderLock("products");
      const mutation =
        operation === "add"
          ? addToCartAction({ productId, quantity: 1 })
          : operation === "update"
            ? updateCartItemAction({ productId, quantity: 3 })
            : removeCartItemAction({ productId });
      await waitForOrderLock("users");
      await lock.release();
      const order = await pending;
      expect(order).toMatchObject({ success: true, status: "PAID" });
      expect(await mutation).toEqual(
        operation === "update"
          ? { success: false, code: "CONFLICT" }
          : { success: true },
      );
      if (order.success)
        expect(
          (
            await client`SELECT quantity FROM order_items WHERE order_id=${order.orderId}`
          )[0].quantity,
        ).toBe(2);
      const remaining =
        await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`;
      expect(remaining).toEqual(operation === "add" ? [{ quantity: 1 }] : []);
    } finally {
      await lock.release();
    }
  }
});
it("ECMSG-77: snapshot máximo persiste bigint exato sem truncar; FK histórica não depende do produto", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { orderDetail } = await import("./order-detail");
  const fixture =
    await client`INSERT INTO products(name,category_id,amount,is_published) SELECT 'Maximum snapshot',${categoryId},2147483647,true FROM generate_series(1,100) RETURNING id`;
  try {
    for (const product of fixture)
      await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},99)`;
    for (const product of fixture)
      await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${product.id},99)`;
    const created = await checkoutAction({ checkoutKey: randomUUID() });
    expect(created).toMatchObject({ success: true, status: "PAYMENT_FAILED" });
    if (!created.success) throw new Error("Maximum checkout failed");
    expect(
      (
        await client`SELECT total_amount FROM orders WHERE id=${created.orderId}`
      )[0].total_amount,
    ).toBe("21260088105300");
    const detail = await orderDetail(created.orderId);
    expect(detail).toMatchObject({
      success: true,
      order: { total: { amount: 21260088105300 } },
    });
    if (detail.success) expect(detail.order.items).toHaveLength(100);
    // Operational deletion only in isolated DB proves historical references survive.
    await client`DELETE FROM cart_items WHERE user_id=${userId}`;
    await client`DELETE FROM inventory WHERE product_id IN ${client(fixture.map((row) => row.id))}`;
    await client`DELETE FROM products WHERE id IN ${client(fixture.map((row) => row.id))}`;
    expect(await orderDetail(created.orderId)).toEqual(detail);
  } finally {
    await client`DELETE FROM cart_items WHERE user_id=${userId}`;
    await client`DELETE FROM inventory WHERE product_id IN ${client(fixture.map((row) => row.id))}`;
    await client`DELETE FROM products WHERE id IN ${client(fixture.map((row) => row.id))}`;
  }
});
it("ECMSG-77: item indisponível bloqueia conjunto inteiro; nunca cria pedido parcial", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const [privateProduct] =
    await client`INSERT INTO products(name,category_id,amount) VALUES ('Unavailable snapshot',${categoryId},1) RETURNING id`;
  try {
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId}),(${userId},${privateProduct.id})`;
    expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
      success: false,
      code: "UNAVAILABLE",
    });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      await client`SELECT product_id FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(2);
  } finally {
    await client`DELETE FROM cart_items WHERE user_id=${userId}`;
    await client`DELETE FROM products WHERE id=${privateProduct.id}`;
  }
});
it("ECMSG-77: constraints de snapshot impedem currency, preço, nome e produto duplicado", async () => {
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${userId},${randomUUID()},1) RETURNING id`;
  await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Snapshot',1,1,1)`;
  await expect(
    client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Duplicate',1,1,1)`,
  ).rejects.toMatchObject({ code: "23505" });
  await expect(
    client`UPDATE order_items SET currency='USD' WHERE order_id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE order_items SET unit_amount=0,subtotal_amount=0 WHERE order_id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE order_items SET product_name='' WHERE order_id=${order.id}`,
  ).rejects.toMatchObject({ code: "23514" });
});
it("ECMSG-77: falha interna não expõe Error/cause/payload nem duplica logs", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const fail = vi
    .spyOn(getDb(), "transaction")
    .mockRejectedValueOnce(
      new Error("DATABASE_URL private; SQL; session token"),
    );
  try {
    const error = await checkoutAction({ checkoutKey: randomUUID() }).catch(
      (error) => error,
    );
    expect(error.message).toBe("Não foi possível concluir o checkout.");
    expect(error).not.toHaveProperty("cause");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(
      /DATABASE_URL|SQL|token|checkoutKey|private/,
    );
  } finally {
    fail.mockRestore();
    warn.mockRestore();
  }
});

it("ECMSG-84: insuficiência/ausência rejeita conjunto sem criar pedido", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { checkoutPreview } = await import("./checkout-preview");
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},3)`;
  for (const quantity of [0, 2]) {
    await client`UPDATE inventory SET available_quantity=${quantity} WHERE product_id=${productId}`;
    expect(await checkoutPreview()).toEqual({
      success: false,
      code: "OUT_OF_STOCK",
    });
    expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
      success: false,
      code: "OUT_OF_STOCK",
    });
  }
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
    success: false,
    code: "OUT_OF_STOCK",
  });
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
  ).toEqual([{ quantity: 3 }]);
  await client`INSERT INTO inventory(product_id) VALUES (${productId})`;
});

it("ECMSG-85: PAID consome uma vez, failed preserva e revisão saturada rollback", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`UPDATE inventory SET available_quantity=5 WHERE product_id=${productId}`;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  const checkoutKey = randomUUID();
  const paid = await checkoutAction({ checkoutKey });
  expect(paid).toMatchObject({ success: true, status: "PAID" });
  expect(
    (
      await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${productId}`
    )[0],
  ).toEqual({ available_quantity: 3, revision: 2 });
  expect(await checkoutAction({ checkoutKey })).toEqual(paid);
  expect(
    (
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
    )[0].available_quantity,
  ).toBe(3);
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  await client`UPDATE products SET amount=1000000 WHERE id=${productId}`;
  expect(await checkoutAction({ checkoutKey: randomUUID() })).toMatchObject({
    success: true,
    status: "PAYMENT_FAILED",
  });
  expect(
    (
      await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${productId}`
    )[0],
  ).toEqual({ available_quantity: 3, revision: 2 });
  expect(
    await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
  ).toEqual([{ quantity: 2 }]);
  await client`UPDATE products SET amount=1099 WHERE id=${productId}`;
  await client`UPDATE inventory SET revision=2147483647 WHERE product_id=${productId}`;
  expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
    success: false,
    code: "CONFLICT",
  });
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(2);
  expect(
    (
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
    )[0].available_quantity,
  ).toBe(3);
});

it.each([
  [1, 1],
  [3, 2],
])("ECMSG-86: estoque %i, compras concorrentes de %i nunca oversell", async (stock, quantity) => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const tokens = [
    (await createSession(userId)).token,
    (await createSession(otherId)).token,
  ];
  await client`UPDATE inventory SET available_quantity=${stock} WHERE product_id=${productId}`;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},${quantity}),(${otherId},${productId},${quantity})`;
  const lock = await holdOrderLock(
    (tx) =>
      tx`SELECT product_id FROM inventory WHERE product_id=${productId} FOR UPDATE`,
  );
  try {
    const pending = Promise.all(
      tokens.map((token) =>
        requestContext.run({ token }, () =>
          checkoutAction({ checkoutKey: randomUUID() }),
        ),
      ),
    );
    await waitForOrderLock("inventory");
    await lock.release();
    const result = await pending;
    expect(result.filter((r) => r.success)).toMatchObject([{ status: "PAID" }]);
    expect(result.filter((r) => !r.success)).toEqual([
      { success: false, code: "OUT_OF_STOCK" },
    ]);
    expect(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
      )[0].available_quantity,
    ).toBe(stock - quantity);
    expect(
      await client`SELECT id FROM orders WHERE user_id IN (${userId},${otherId})`,
    ).toHaveLength(1);
  } finally {
    await lock.release();
  }
});
it("ECMSG-86: múltiplos produtos invertidos são lockados em ordem estável e atômicos", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const [second] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Second stock',${categoryId},100,true) RETURNING id`;
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${second.id},1)`;
  await client`UPDATE inventory SET available_quantity=1 WHERE product_id=${productId}`;
  const tokens = [
    (await createSession(userId)).token,
    (await createSession(otherId)).token,
  ];
  try {
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId}),(${userId},${second.id}),(${otherId},${second.id}),(${otherId},${productId})`;
    const result = await Promise.all(
      tokens.map((token) =>
        requestContext.run({ token }, () =>
          checkoutAction({ checkoutKey: randomUUID() }),
        ),
      ),
    );
    expect(result.filter((r) => r.success)).toHaveLength(1);
    expect(result.filter((r) => !r.success)).toEqual([
      { success: false, code: "OUT_OF_STOCK" },
    ]);
    expect(
      await client`SELECT available_quantity FROM inventory WHERE product_id IN (${productId},${second.id})`,
    ).toEqual([{ available_quantity: 0 }, { available_quantity: 0 }]);
    expect(
      await client`SELECT product_id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`,
    ).toHaveLength(2);
  } finally {
    await client`DELETE FROM cart_items WHERE product_id=${second.id}`;
    await client`DELETE FROM inventory WHERE product_id=${second.id}`;
    await client`DELETE FROM products WHERE id=${second.id}`;
  }
});
it("ECMSG-86: sessão expirada esperando inventory não cria pedido nem consome", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { tokenHash } = await import("@/features/auth/server/session");
  await client`UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE token_hash=${tokenHash(request.token)}`;
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const lock = await holdOrderLock(
    (tx) =>
      tx`SELECT product_id FROM inventory WHERE product_id=${productId} FOR UPDATE`,
  );
  try {
    const pending = checkoutAction({ checkoutKey: randomUUID() });
    await waitForOrderLock("inventory");
    await client`SELECT pg_sleep(1.1)`;
    await lock.release();
    expect(await pending).toEqual({ success: false, code: "UNAUTHENTICATED" });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
      )[0].available_quantity,
    ).toBe(99);
  } finally {
    await lock.release();
  }
});

it.each([
  "checkout",
  "admin",
] as const)("ECMSG-88: %s ganha lock, sem lost update admin × checkout", async (first) => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const { setInventoryQuantityAction } = await import(
    "@/features/inventory/actions/set-inventory.action"
  );
  await client`UPDATE users SET role='admin' WHERE id=${otherId}`;
  const customer = (await createSession(userId)).token;
  const admin = (await createSession(otherId)).token;
  await client`UPDATE inventory SET available_quantity=1,revision=1 WHERE product_id=${productId}`;
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  const lock = await holdOrderLock(
    (tx) =>
      tx`SELECT product_id FROM inventory WHERE product_id=${productId} FOR UPDATE`,
  );
  const buy = () =>
    requestContext.run({ token: customer }, () =>
      checkoutAction({ checkoutKey: randomUUID() }),
    );
  const set = () =>
    requestContext.run({ token: admin }, () =>
      setInventoryQuantityAction({ productId, quantity: 0, revision: 1 }),
    );
  try {
    const firstPending = first === "checkout" ? buy() : set();
    await waitForOrderLock("inventory");
    const secondPending = first === "checkout" ? set() : buy();
    await waitForOrderLock("inventory", 2);
    await lock.release();
    const [a, b] = await Promise.all([firstPending, secondPending]);
    expect(a).toMatchObject({ success: true });
    expect(b).toEqual({
      success: false,
      code: first === "checkout" ? "CONFLICT" : "OUT_OF_STOCK",
    });
    expect(
      (
        await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${productId}`
      )[0],
    ).toEqual({ available_quantity: 0, revision: 2 });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(first === "checkout" ? 1 : 0);
  } finally {
    await lock.release();
    await client`UPDATE users SET role='customer' WHERE id=${otherId}`;
  }
});
it("ECMSG-90: item insuficiente bloqueia todos e preserva estoque/carrinho", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const [second] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Insufficient stock',${categoryId},100,true) RETURNING id`;
  await client`INSERT INTO inventory(product_id) VALUES (${second.id})`;
  try {
    await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId}),(${userId},${second.id})`;
    expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
      success: false,
      code: "OUT_OF_STOCK",
    });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      await client`SELECT product_id FROM cart_items WHERE user_id=${userId}`,
    ).toHaveLength(2);
    expect(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
      )[0].available_quantity,
    ).toBe(99);
  } finally {
    await client`DELETE FROM cart_items WHERE product_id=${second.id}`;
    await client`DELETE FROM inventory WHERE product_id=${second.id}`;
    await client`DELETE FROM products WHERE id=${second.id}`;
  }
});
it("ECMSG-90: pagamento recusado concorrente libera unidades para compra elegível", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  const tokens = [
    (await createSession(userId)).token,
    (await createSession(otherId)).token,
  ];
  await client`UPDATE products SET amount=500000 WHERE id=${productId}`;
  await client`UPDATE inventory SET available_quantity=2 WHERE product_id=${productId}`;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2),(${otherId},${productId},1)`;
  const lock = await holdOrderLock(
    (tx) =>
      tx`SELECT product_id FROM inventory WHERE product_id=${productId} FOR UPDATE`,
  );
  try {
    const refused = requestContext.run({ token: tokens[0] }, () =>
      checkoutAction({ checkoutKey: randomUUID() }),
    );
    await waitForOrderLock("inventory");
    const approved = requestContext.run({ token: tokens[1] }, () =>
      checkoutAction({ checkoutKey: randomUUID() }),
    );
    await waitForOrderLock("inventory", 2);
    await lock.release();
    expect(await refused).toMatchObject({
      success: true,
      status: "PAYMENT_FAILED",
    });
    expect(await approved).toMatchObject({ success: true, status: "PAID" });
    expect(
      (
        await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${productId}`
      )[0],
    ).toEqual({ available_quantity: 1, revision: 2 });
    expect(
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
    ).toEqual([{ quantity: 2 }]);
  } finally {
    await lock.release();
  }
});
it("ECMSG-90: defesa condicionada do decremento retorna conflito e rollback", async () => {
  const { checkoutAction } = await import("../actions/checkout.action");
  await client`INSERT INTO cart_items(user_id,product_id) VALUES (${userId},${productId})`;
  // A test-only trigger simulates a privileged change after validation, before consumption.
  await client.unsafe(`CREATE FUNCTION pg_temp.inventory_guard_test() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN UPDATE inventory SET available_quantity=0 WHERE product_id IN (SELECT product_id FROM cart_items WHERE user_id=NEW.user_id); RETURN NEW; END $$;
 CREATE TRIGGER inventory_guard_test BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION pg_temp.inventory_guard_test();`);
  try {
    expect(await checkoutAction({ checkoutKey: randomUUID() })).toEqual({
      success: false,
      code: "CONFLICT",
    });
    expect(
      await client`SELECT id FROM orders WHERE user_id=${userId}`,
    ).toHaveLength(0);
    expect(
      (
        await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
      )[0].available_quantity,
    ).toBe(99);
    expect(
      await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
    ).toEqual([{ quantity: 1 }]);
  } finally {
    await client.unsafe(
      "DROP TRIGGER inventory_guard_test ON orders; DROP FUNCTION pg_temp.inventory_guard_test();",
    );
  }
});

it("ECMSG-97: listagem administrativa nega visitante/customer e projeta pedidos de outros donos", async () => {
  const { adminOrderList } = await import("./admin-order-list");
  request.token = undefined;
  expect(await adminOrderList()).toMatchObject({ success: false });
  request.token = (await createSession(userId)).token;
  expect(await adminOrderList()).toMatchObject({
    success: false,
    code: "FORBIDDEN",
  });
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${otherId},${randomUUID()},1099,'PAID') RETURNING id`;
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  try {
    const result = await adminOrderList({ limit: "1", sort: "created-desc" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderId).toBe(order.id);
      expect(Object.keys(result.orders[0]).sort()).toEqual([
        "createdAt",
        "orderId",
        "status",
        "total",
      ]);
    }
    expect(await adminOrderList({ limit: "51" })).toMatchObject({
      code: "INVALID_INPUT",
    });
  } finally {
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-98: detalhe administrativo exige role atual e usa snapshot mínimo", async () => {
  const { adminOrderDetail } = await import("./admin-order-detail");
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${otherId},${randomUUID()},2198,'PAID') RETURNING id`;
  await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Historical name',2,1099,2198)`;
  expect(await adminOrderDetail(order.id)).toMatchObject({ code: "FORBIDDEN" });
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  try {
    await client`UPDATE products SET name='Current name',amount=1200 WHERE id=${productId}`;
    const result = await adminOrderDetail(order.id);
    expect(result).toMatchObject({
      success: true,
      order: {
        total: { amount: 2198 },
        items: [{ productName: "Historical name", price: { amount: 1099 } }],
      },
    });
    if (result.success) {
      expect(Object.keys(result.order).sort()).toEqual([
        "createdAt",
        "items",
        "orderId",
        "status",
        "total",
      ]);
      expect(Object.keys(result.order.items[0]).sort()).toEqual([
        "price",
        "productName",
        "quantity",
        "subtotal",
      ]);
    }
    expect(await adminOrderDetail(randomUUID())).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await adminOrderDetail("' OR 1=1 --")).toMatchObject({
      code: "NOT_FOUND",
    });
  } finally {
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-99: leituras administrativas preservam estado e snapshot, rejeitando intenção de alteração", async () => {
  const { adminOrderList } = await import("./admin-order-list");
  const { adminOrderDetail } = await import("./admin-order-detail");
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${otherId},${randomUUID()},1099,'PAYMENT_FAILED') RETURNING id`;
  await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Immutable snapshot',1,1099,1099)`;
  const before =
    await client`SELECT status,total_amount,checkout_key FROM orders WHERE id=${order.id}`;
  const items =
    await client`SELECT * FROM order_items WHERE order_id=${order.id}`;
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  try {
    expect((await adminOrderList()).success).toBe(true);
    expect((await adminOrderDetail(order.id)).success).toBe(true);
    expect(
      await adminOrderList({ operation: "mark-paid", total: 1 }),
    ).toMatchObject({ code: "INVALID_INPUT" });
    expect(
      await adminOrderDetail({ orderId: order.id, status: "PAID" }),
    ).toMatchObject({ code: "NOT_FOUND" });
    const actions = await import("../actions/checkout.action");
    expect(Object.keys(actions)).toEqual(["checkoutAction"]);
    expect(
      await actions.checkoutAction({
        checkoutKey: randomUUID(),
        orderId: order.id,
        status: "PAID",
      }),
    ).toMatchObject({ code: "INVALID_INPUT" });
    expect(
      await client`SELECT status,total_amount,checkout_key FROM orders WHERE id=${order.id}`,
    ).toEqual(before);
    expect(
      await client`SELECT * FROM order_items WHERE order_id=${order.id}`,
    ).toEqual(items);
  } finally {
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-100: filtros administrativos usam status/ID exato e paginação estável", async () => {
  const { adminOrderList } = await import("./admin-order-list");
  const [paid] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${otherId},${randomUUID()},1099,'PAID') RETURNING id`;
  await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${otherId},${randomUUID()},1099,'PAYMENT_FAILED')`;
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  try {
    const result = await adminOrderList({
      orderId: paid.id,
      status: "PAID",
      sort: "created-asc",
      limit: "1",
    });
    expect(result.success && result.orders.map((row) => row.orderId)).toEqual([
      paid.id,
    ]);
    const none = await adminOrderList({
      orderId: paid.id,
      status: "PAYMENT_FAILED",
    });
    expect(none.success && none.orders).toEqual([]);
    const first = await adminOrderList({ limit: "1", sort: "created-desc" });
    const second = await adminOrderList({
      limit: "1",
      sort: "created-desc",
      page: "2",
    });
    expect(first.success && first.hasNext).toBe(true);
    expect(
      first.success &&
        second.success &&
        first.orders[0].orderId !== second.orders[0].orderId,
    ).toBe(true);
  } finally {
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-102: leituras administrativas negam role removida, sessão revogada e expirada", async () => {
  const { adminOrderList } = await import("./admin-order-list");
  const { adminOrderDetail } = await import("./admin-order-detail");
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${otherId},${randomUUID()},1099) RETURNING id`;
  await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${productId},'Private snapshot',1,1099,1099)`;
  try {
    for (const failure of ["role", "revoked", "expired"] as const) {
      await client`UPDATE users SET role='admin' WHERE id=${userId}`;
      request.token = (await createSession(userId)).token;
      expect((await adminOrderDetail(order.id)).success).toBe(true);
      if (failure === "role")
        await client`UPDATE users SET role='customer' WHERE id=${userId}`;
      if (failure === "revoked")
        await client`DELETE FROM sessions WHERE user_id=${userId}`;
      if (failure === "expired")
        await client`UPDATE sessions SET created_at=clock_timestamp()-interval '3 seconds',last_active_at=clock_timestamp()-interval '2 seconds',expires_at=clock_timestamp()-interval '1 second' WHERE user_id=${userId}`;
      expect((await adminOrderList()).success).toBe(false);
      expect((await adminOrderDetail(order.id)).success).toBe(false);
    }
  } finally {
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-102: role removida durante espera pelo lock não libera snapshot administrativo", async () => {
  const { adminOrderList } = await import("./admin-order-list");
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  const lock = await holdOrderLock(async (tx) => {
    await tx`SELECT id FROM users WHERE id=${userId} FOR UPDATE`;
    await tx`UPDATE users SET role='customer' WHERE id=${userId}`;
  });
  try {
    const pending = adminOrderList();
    await waitForOrderLock("users");
    await lock.release();
    expect(await pending).toMatchObject({ success: false, code: "FORBIDDEN" });
  } finally {
    await lock.release();
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-102: expiração aguardando lock bloqueia leitura administrativa", async () => {
  const { adminOrderDetail } = await import("./admin-order-detail");
  await client`UPDATE users SET role='admin' WHERE id=${userId}`;
  const [order] =
    await client`INSERT INTO orders(user_id,checkout_key,total_amount) VALUES (${otherId},${randomUUID()},1099) RETURNING id`;
  await client`UPDATE sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE user_id=${userId}`;
  const lock = await holdOrderLock(
    (tx) => tx`SELECT id FROM users WHERE id=${userId} FOR UPDATE`,
  );
  try {
    const pending = adminOrderDetail(order.id);
    await waitForOrderLock("users");
    await client`SELECT pg_sleep(1.1)`;
    await lock.release();
    expect(await pending).toMatchObject({
      success: false,
      code: "UNAUTHENTICATED",
    });
  } finally {
    await lock.release();
    await client`UPDATE users SET role='customer' WHERE id=${userId}`;
  }
});

it("ECMSG-110: evento final único por intenção paga/recusada e rollback integral", async () => {
  const { createOrder } = await import("./create-order");
  for (const amount of [1099, 1000000]) {
    await client`UPDATE products SET amount=${amount} WHERE id=${productId}`;
    await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=1`;
    const key = randomUUID();
    const order = await createOrder({ checkoutKey: key });
    expect(order).toMatchObject({
      success: true,
      status: amount === 1099 ? "PAID" : "PAYMENT_FAILED",
    });
    expect(await createOrder({ checkoutKey: key })).toEqual(order);
    if (!order.success) throw new Error("Expected order");
    const events =
      await client`SELECT event_type,outcome FROM audit_events WHERE target_id=${order.orderId}`;
    expect(events).toEqual([
      {
        event_type: "order.completed",
        outcome: amount === 1099 ? "SUCCESS" : "FAILED",
      },
    ]);
  }
  await client`UPDATE products SET amount=1099 WHERE id=${productId}`;
  const before = (
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
  )[0].available_quantity;
  const writer = await import("@/lib/audit/server");
  const spy = vi
    .spyOn(writer, "writeAuditEvent")
    .mockRejectedValueOnce(new Error("Synthetic sink failure"));
  const key = randomUUID();
  try {
    await expect(createOrder({ checkoutKey: key })).rejects.toThrow(
      "Não foi possível concluir o checkout.",
    );
  } finally {
    spy.mockRestore();
  }
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId} AND checkout_key=${key}`,
  ).toHaveLength(0);
  expect(
    (
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
    )[0].available_quantity,
  ).toBe(before);
  expect(
    await client`SELECT quantity FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(1);
});

it("ECMSG-113: cap rejeita intenção nova mas retry retorna pedido sem consumir budget", async () => {
  const { createOrder } = await import("./create-order");
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  const key = randomUUID();
  const order = await createOrder({ checkoutKey: key });
  expect(order.success).toBe(true);
  await client`UPDATE abuse_budgets SET attempts=5 WHERE user_id=${userId} AND operation='checkout'`;
  expect(await createOrder({ checkoutKey: randomUUID() })).toEqual({
    success: false,
    code: "RATE_LIMITED",
  });
  expect(await createOrder({ checkoutKey: key })).toEqual(order);
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='checkout'`
    )[0].attempts,
  ).toBe(5);
  expect(
    (
      await client`SELECT count(*)::int AS count FROM audit_events WHERE actor_user_id=${userId} AND event_type='order.completed'`
    )[0].count,
  ).toBe(1);
});
it("ECMSG-113: falha do audit desfaz negócio mas confirma reserva", async () => {
  const { createOrder } = await import("./create-order");
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  const writer = await import("@/lib/audit/server");
  const spy = vi
    .spyOn(writer, "writeAuditEvent")
    .mockRejectedValueOnce(new Error("Synthetic sink failure"));
  try {
    await expect(createOrder({ checkoutKey: randomUUID() })).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='checkout'`
    )[0].attempts,
  ).toBe(1);
  expect(
    await client`SELECT id FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    (
      await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`
    )[0].available_quantity,
  ).toBe(99);
});
