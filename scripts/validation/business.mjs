import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, replay } from "./http.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const data = fixtures();
const a = data.users.find((u) => u.name === "a");
const b = data.users.find((u) => u.name === "b");
const product = data.products[0];
const sql = await openLabDb();
const cases = [];
const check = (id, expected, observed, passed) =>
  cases.push({ id, expected, observed, status: passed ? "PASS" : "FAIL" });
const cart = async (user, id = product.id, quantity = 1) => {
  // Scenario setup changes only this run's fixture cart, never the live application's rules.
  await sql`DELETE FROM cart_items WHERE user_id=${user.id}`;
  await sql`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${user.id},${id},${quantity})`;
};
const order = async (user, payment) => {
  const input = { checkoutKey: randomUUID(), ...(payment ? { payment } : {}) };
  const response = await replay("checkout", input, { token: user.token });
  assert.equal(
    response.result?.success,
    true,
    `Checkout positive control failed: ${response.result?.code}`,
  );
  return { ...response.result, input };
};
try {
  const key = randomUUID();
  for (const field of [
    "amount",
    "total",
    "discount",
    "currency",
    "userId",
    "status",
    "paymentStatus",
  ]) {
    const response = await replay(
      "checkout",
      { checkoutKey: key, payment: { method: "PIX" }, [field]: "untrusted" },
      { token: a.token },
    );
    check(
      `BUSINESS_${field.toUpperCase()}`,
      "Client commercial authority rejected",
      `code=${response.result?.code}`,
      response.result?.code === "INVALID_INPUT",
    );
  }
  const method = await replay(
    "checkout",
    { checkoutKey: key, payment: { method: "REAL_GATEWAY" } },
    { token: a.token },
  );
  check(
    "BUSINESS_METHOD",
    "Unknown payment method rejected",
    `code=${method.result?.code}`,
    method.result?.code === "INVALID_INPUT",
  );
  await cart(a, product.id, 2);
  const foreign = await replay(
    "checkout",
    {
      checkoutKey: randomUUID(),
      payment: { method: "CARD", cardId: b.cardId },
    },
    { token: a.token },
  );
  check(
    "BUSINESS_CARD_OWNER",
    "Other owner's card cannot authorize order",
    `code=${foreign.result?.code}`,
    foreign.result?.code === "INVALID_CARD",
  );
  const card = await order(a, { method: "CARD", cardId: a.cardId });
  const duplicate = await replay(
    "checkout",
    { ...card.input, payment: { method: "PIX" } },
    { token: a.token },
  );
  const [snapshot] =
    await sql`SELECT total_amount FROM orders WHERE id=${card.orderId}`;
  const [audit] =
    await sql`SELECT count(*)::int AS n FROM audit_events WHERE target_id=${card.orderId} AND event_type='order.completed'`;
  check(
    "BUSINESS_CARD_TOTAL_RETRY",
    "Server total 2400; same key returns original, one final event",
    `status=${card.status}; total=${snapshot.total_amount}; retry=${duplicate.result?.orderId === card.orderId}; events=${audit.n}`,
    card.status === "PAID" &&
      Number(snapshot.total_amount) === 2400 &&
      duplicate.result?.orderId === card.orderId &&
      audit.n === 1,
  );
  await cart(b);
  const pix = await order(b, { method: "PIX" });
  const early = await replay(
    "confirmPayment",
    { orderId: pix.orderId },
    { token: b.token },
  );
  check(
    "BUSINESS_EARLY",
    "Early confirmation denied by backend",
    `status=${pix.status}; code=${early.result?.code}`,
    pix.status === "PENDING_PAYMENT" && early.result?.code === "NOT_READY",
  );
  await sql`UPDATE products SET amount=9999 WHERE id=${product.id}`;
  await sql`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 minutes',approvable_at=clock_timestamp()-interval '1 second' WHERE order_id=${pix.orderId}`;
  const approved = await replay(
    "confirmPayment",
    { orderId: pix.orderId },
    { token: b.token },
  );
  const again = await replay(
    "confirmPayment",
    { orderId: pix.orderId },
    { token: b.token },
  );
  const [frozen] =
    await sql`SELECT total_amount FROM orders WHERE id=${pix.orderId}`;
  check(
    "BUSINESS_PIX_SNAPSHOT",
    "Fixture-eligible Pix uses frozen total and terminal retry",
    `first=${approved.result?.status}; again=${again.result?.status}; total=${frozen.total_amount}`,
    approved.result?.status === "PAID" &&
      again.result?.status === "PAID" &&
      Number(frozen.total_amount) === 1200,
  );
  await sql`UPDATE products SET amount=1200 WHERE id=${product.id}`;
  await cart(a);
  const boleto = await order(a, { method: "BOLETO" });
  const [time] =
    await sql`SELECT approvable_at FROM order_payments WHERE order_id=${boleto.orderId}`;
  while (Date.now() <= new Date(time.approvable_at).getTime() + 100)
    await new Promise((resolve) => setTimeout(resolve, 3000));
  const boletoPaid = await replay(
    "confirmPayment",
    { orderId: boleto.orderId },
    { token: a.token },
  );
  check(
    "BUSINESS_BOLETO_NATURAL",
    "Boleto approved only after natural 60-second interval",
    `status=${boletoPaid.result?.status}`,
    boletoPaid.result?.status === "PAID",
  );
  await cart(b);
  const expired = await order(b, { method: "BOLETO" });
  await sql`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 days',approvable_at=clock_timestamp()-interval '1 day',expires_at=clock_timestamp()-interval '1 second' WHERE order_id=${expired.orderId}`;
  const expiration = await replay(
    "confirmPayment",
    { orderId: expired.orderId },
    { token: b.token },
  );
  check(
    "BUSINESS_EXPIRED_FIXTURE",
    "Expired fixture persists terminal expiration, cannot become paid",
    `status=${expiration.result?.status}`,
    expiration.result?.status === "PAYMENT_EXPIRED",
  );
  await cart(a, data.products[2].id);
  const declined = await order(a, { method: "CARD", cardId: a.cardId });
  const remaining = await sql`SELECT * FROM cart_items WHERE user_id=${a.id}`;
  check(
    "BUSINESS_DECLINE",
    "Academic amount rule declines and preserves cart",
    `status=${declined.status}; cartRows=${remaining.length}`,
    declined.status === "PAYMENT_FAILED" && remaining.length === 1,
  );
  await cart(b);
  const legacy = await order(b);
  const paymentRows =
    await sql`SELECT id FROM order_payments WHERE order_id=${legacy.orderId}`;
  check(
    "BUSINESS_LEGACY",
    "Documented method-less simulator remains server-owned",
    `status=${legacy.status}; paymentRows=${paymentRows.length}`,
    legacy.status === "PAID" && paymentRows.length === 0,
  );
  await assertIntegrity(sql);
} finally {
  await sql`UPDATE products SET amount=1200 WHERE id=${product.id}`;
  await sql.end();
}
cases.push({
  id: "NATURAL_BOLETO_EXPIRY",
  expected: "Observe complete 24-hour boleto expiration naturally",
  observed:
    "Expiration boundary tested using explicitly aged fixture; 24-hour wait not executed",
  status: "LIMITATION",
});
writeEvidence("task-09-business", cases);
if (cases.some((c) => c.status === "FAIL")) process.exitCode = 1;
