import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { hashPassword } from "@/features/auth/server/password";
import { createSession } from "@/features/auth/server/session";
import { confirmPayment } from "./confirm-payment";
import { createOrder } from "./create-order";
import { orderHistory } from "./order-history";
import { readPayment } from "./read-payment";
import { readTestCards, removeTestCard, saveTestCard } from "./test-cards";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({ token: "" }));
const requestContext = await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import("node:async_hooks");
  return new AsyncLocalStorage<{ token: string }>();
});
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: requestContext.getStore()?.token ?? request.token }),
  }),
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
let productId: string;
let categoryId: string;
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const hash = await hashPassword("Payment integration passphrase");
  const rows =
    await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@payment.example.test`},${hash}),(${`${randomUUID()}@payment.example.test`},${hash}) RETURNING id`;
  [userId, otherId] = rows.map((row) => row.id);
  const [category] =
    await client`INSERT INTO categories(name) VALUES (${`Payments ${randomUUID()}`}) RETURNING id`;
  categoryId = category.id;
  const [product] =
    await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Payment fixture',${categoryId},1099,true) RETURNING id`;
  productId = product.id;
  await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${productId},10)`;
});
beforeEach(async () => {
  await cleanupOrders();
  await client`UPDATE inventory SET available_quantity=10,revision=1 WHERE product_id=${productId}`;
  await client`UPDATE products SET amount=1099,is_published=true WHERE id=${productId}`;
  await client`DELETE FROM saved_test_cards WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  token = (await createSession(userId)).token;
  request.token = token;
});
afterAll(async () => {
  await cleanupOrders();
  await client`DELETE FROM saved_test_cards WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM abuse_budgets WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM users WHERE id IN (${userId},${otherId})`;
  await client`DELETE FROM inventory WHERE product_id=${productId}`;
  await client`DELETE FROM products WHERE id=${productId}`;
  await client`DELETE FROM categories WHERE id=${categoryId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
async function cleanupOrders() {
  await client`DELETE FROM audit_events WHERE actor_user_id IN (${userId},${otherId})`;
  await client`DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${userId},${otherId}))`;
  await client`DELETE FROM orders WHERE user_id IN (${userId},${otherId})`;
  await client`DELETE FROM cart_items WHERE user_id IN (${userId},${otherId})`;
}
async function pending(method: "PIX" | "BOLETO" = "PIX") {
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},2)`;
  const input = { checkoutKey: randomUUID(), payment: { method } };
  const result = await createOrder(input);
  if (!result.success) throw new Error("Order fixture failed");
  return { input, orderId: result.orderId };
}
async function ready(orderId: string) {
  await client`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 minutes', approvable_at=clock_timestamp()-interval '1 second' WHERE order_id=${orderId}`;
}
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
it("payments: persists pending intent, denies early approval and concurrent retries consume once", async () => {
  const { input, orderId } = await pending();
  expect(await createOrder(input)).toEqual({
    success: true,
    orderId,
    status: "PENDING_PAYMENT",
  });
  expect(await confirmPayment({ orderId })).toEqual({
    success: false,
    code: "NOT_READY",
  });
  const [before] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(before.available_quantity).toBe(10);
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  await client`UPDATE products SET amount=999999 WHERE id=${productId}`;
  await ready(orderId);
  const results = await Promise.all([
    confirmPayment({ orderId }),
    confirmPayment({ orderId }),
  ]);
  expect(results).toEqual([
    { success: true, status: "PAID" },
    { success: true, status: "PAID" },
  ]);
  const [after] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(after.available_quantity).toBe(8);
  expect(
    await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(1);
  const [order] =
    await client`SELECT total_amount FROM orders WHERE id=${orderId}`;
  expect(Number(order.total_amount)).toBe(2198);
  expect(
    await client`SELECT * FROM audit_events WHERE target_id=${orderId} AND event_type='order.completed'`,
  ).toHaveLength(1);
});
it("payments: BOLA, expiration and insufficient stock are decided by the server", async () => {
  const { orderId } = await pending("BOLETO");
  expect(await readPayment(orderId)).toMatchObject({
    method: "BOLETO",
    status: "PENDING",
    cardLast4: null,
  });
  const history = await orderHistory();
  expect(history.success && history.orders[0].paymentMethod).toBe("BOLETO");
  request.token = (await createSession(otherId)).token;
  expect(await readPayment(orderId)).toBeNull();
  expect(await confirmPayment({ orderId })).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
  request.token = token;
  await client`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 days', approvable_at=clock_timestamp()-interval '1 day', expires_at=clock_timestamp()-interval '1 second' WHERE order_id=${orderId}`;
  expect(await confirmPayment({ orderId })).toEqual({
    success: true,
    status: "PAYMENT_EXPIRED",
  });
  expect(await confirmPayment({ orderId })).toEqual({
    success: true,
    status: "PAYMENT_EXPIRED",
  });
  const next = await pending();
  await ready(next.orderId);
  await client`UPDATE inventory SET available_quantity=1 WHERE product_id=${productId}`;
  expect(await confirmPayment({ orderId: next.orderId })).toEqual({
    success: true,
    status: "PAYMENT_FAILED",
  });
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(1);
});
it.each([
  "payment",
  "session",
])("payments: %s expiry while audit is blocked rolls back approval, stock and audit", async (expiry) => {
  const { orderId } = await pending();
  await ready(orderId);
  if (expiry === "payment")
    await client`UPDATE order_payments SET expires_at=clock_timestamp()+interval '2 seconds' WHERE order_id=${orderId}`;
  else
    await client`UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE user_id=${userId}`;
  const blocker = postgres(value, { max: 1, onnotice: () => {} });
  await blocker`BEGIN`;
  await blocker`LOCK TABLE audit_events IN EXCLUSIVE MODE`;
  const outcome = confirmPayment({ orderId }).then(
    (result) =>
      !result.success && result.code === "UNAUTHENTICATED"
        ? "session-expired"
        : "unexpected-success",
    () => "rolled-back",
  );
  try {
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const [state] =
        await client`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%insert into "audit_events"%') AS waiting`;
      if (state.waiting) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(waiting).toBe(true);
    await client`SELECT pg_sleep(2.1)`;
  } finally {
    await blocker`ROLLBACK`;
    await blocker.end();
  }
  expect(await outcome).toBe(
    expiry === "payment" ? "rolled-back" : "session-expired",
  );
  const [state] =
    await client`SELECT o.status,p.status AS payment_status,i.available_quantity FROM orders o JOIN order_payments p ON p.order_id=o.id CROSS JOIN inventory i WHERE o.id=${orderId} AND i.product_id=${productId}`;
  expect(state).toMatchObject({
    status: "PENDING_PAYMENT",
    payment_status: "PENDING",
    available_quantity: 10,
  });
  expect(
    await client`SELECT * FROM audit_events WHERE target_id=${orderId}`,
  ).toHaveLength(0);
  request.token = (await createSession(userId)).token;
  expect(await confirmPayment({ orderId })).toEqual({
    success: true,
    status: expiry === "payment" ? "PAYMENT_EXPIRED" : "PAID",
  });
});
it("card checkout: owner and expiry are checked, masked payment survives removal and replay", async () => {
  await saveTestCard(card);
  const [saved] = await readTestCards();
  request.token = (await createSession(otherId)).token;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},1)`;
  expect(
    await createOrder({
      checkoutKey: randomUUID(),
      payment: { method: "CARD", cardId: saved.id },
    }),
  ).toEqual({ success: false, code: "INVALID_CARD" });
  request.token = token;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  const input = {
    checkoutKey: randomUUID(),
    payment: { method: "CARD", cardId: saved.id },
  };
  const result = await createOrder(input);
  expect(result).toMatchObject({ success: true, status: "PAID" });
  if (!result.success) throw new Error("Order failed");
  const [payment] =
    await client`SELECT method,status,card_last4 FROM order_payments WHERE order_id=${result.orderId}`;
  expect(payment).toEqual({
    method: "CARD",
    status: "APPROVED",
    card_last4: "0001",
  });
  await removeTestCard({ cardId: saved.id });
  expect(await createOrder(input)).toEqual(result);
  expect(
    await client`SELECT * FROM order_payments WHERE order_id=${result.orderId}`,
  ).toHaveLength(1);
  expect(await createOrder({ ...input, checkoutKey: randomUUID() })).toEqual({
    success: false,
    code: "INVALID_CARD",
  });
});
it("payments: two owners competing for the last units cannot oversell", async () => {
  const first = await pending();
  request.token = (await createSession(otherId)).token;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${otherId},${productId},2)`;
  const second = await createOrder({
    checkoutKey: randomUUID(),
    payment: { method: "BOLETO" },
  });
  if (!second.success) throw new Error("Second order failed");
  await ready(first.orderId);
  await ready(second.orderId);
  await client`UPDATE inventory SET available_quantity=2 WHERE product_id=${productId}`;
  const otherToken = (await createSession(otherId)).token;
  const a = requestContext.run({ token }, () =>
    confirmPayment({ orderId: first.orderId }),
  );
  const b = requestContext.run({ token: otherToken }, () =>
    confirmPayment({ orderId: second.orderId }),
  );
  const outcomes = await Promise.all([a, b]);
  expect(outcomes.map((r) => (r.success ? r.status : r.code)).sort()).toEqual([
    "PAID",
    "PAYMENT_FAILED",
  ]);
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(0);
});
it("payments: malicious authority and direct invalid transitions are rejected", async () => {
  const { orderId } = await pending();
  for (const field of ["status", "total", "userId", "approved", "expiresAt"])
    expect(await confirmPayment({ orderId, [field]: "untrusted" })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
  await expect(
    client`UPDATE order_payments SET status='APPROVED' WHERE order_id=${orderId}`,
  ).rejects.toMatchObject({ code: "23514" });
  request.token = "";
  expect(await confirmPayment({ orderId })).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
});
it("card checkout: an expired saved card is rejected without converting cart", async () => {
  await saveTestCard(card);
  const [saved] = await readTestCards();
  await client`UPDATE saved_test_cards SET expiry_year=2026,expiry_month=1 WHERE id=${saved.id}`;
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  expect(
    await createOrder({
      checkoutKey: randomUUID(),
      payment: { method: "CARD", cardId: saved.id },
    }),
  ).toEqual({ success: false, code: "INVALID_CARD" });
  expect(
    await client`SELECT * FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(1);
});
it("card checkout: session expiring during audit rolls back the entire checkout", async () => {
  await saveTestCard(card);
  const [saved] = await readTestCards();
  await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${userId},${productId},1)`;
  await client`UPDATE sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE user_id=${userId}`;
  const blocker = postgres(value, { max: 1, onnotice: () => {} });
  await blocker`BEGIN`;
  await blocker`LOCK TABLE audit_events IN EXCLUSIVE MODE`;
  const outcome = createOrder({
    checkoutKey: randomUUID(),
    payment: { method: "CARD", cardId: saved.id },
  });
  try {
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      const [state] =
        await client`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%insert into "audit_events"%') AS waiting`;
      if (state.waiting) {
        waiting = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(waiting).toBe(true);
    await client`SELECT pg_sleep(2.1)`;
  } finally {
    await blocker`ROLLBACK`;
    await blocker.end();
  }
  expect(await outcome).toEqual({ success: false, code: "UNAUTHENTICATED" });
  expect(
    await client`SELECT * FROM orders WHERE user_id=${userId}`,
  ).toHaveLength(0);
  expect(
    await client`SELECT * FROM cart_items WHERE user_id=${userId}`,
  ).toHaveLength(1);
  const [stock] =
    await client`SELECT available_quantity FROM inventory WHERE product_id=${productId}`;
  expect(stock.available_quantity).toBe(10);
});
it("payments: a PostgreSQL audit failure rolls back approval but retains abuse budget", async () => {
  const { orderId } = await pending();
  await ready(orderId);
  await client`CREATE FUNCTION pg_temp.reject_payment_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='order.completed' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$`;
  await client`CREATE TRIGGER payment_audit_test BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_payment_audit()`;
  try {
    await expect(confirmPayment({ orderId })).rejects.toThrow(
      "Não foi possível confirmar o pagamento simulado.",
    );
    const [row] =
      await client`SELECT o.status,p.status AS payment_status,i.available_quantity FROM orders o JOIN order_payments p ON p.order_id=o.id CROSS JOIN inventory i WHERE o.id=${orderId} AND i.product_id=${productId}`;
    expect(row).toMatchObject({
      status: "PENDING_PAYMENT",
      payment_status: "PENDING",
      available_quantity: 10,
    });
    const [budget] =
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='payment.confirm'`;
    expect(budget.attempts).toBe(1);
    expect(
      await client`SELECT * FROM audit_events WHERE target_id=${orderId}`,
    ).toHaveLength(0);
  } finally {
    await client`DROP TRIGGER payment_audit_test ON audit_events`;
    await client`DROP FUNCTION pg_temp.reject_payment_audit()`;
  }
  expect(await confirmPayment({ orderId })).toEqual({
    success: true,
    status: "PAID",
  });
});
