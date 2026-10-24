import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, replay } from "./http.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const data = fixtures();
const a = data.users.find((u) => u.name === "a");
const b = data.users.find((u) => u.name === "b");
const sql = await openLabDb();
const cases = [];
const check = (id, expected, observed, passed) =>
  cases.push({ id, expected, observed, status: passed ? "PASS" : "FAIL" });
const cart = async (user, productId, quantity = 1) => {
  await sql`DELETE FROM cart_items WHERE user_id=${user.id}`;
  await sql`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${user.id},${productId},${quantity})`;
};
try {
  const last = data.products[1].id;
  await sql`UPDATE inventory SET available_quantity=1 WHERE product_id=${last}`;
  await cart(a, last);
  await cart(b, last);
  const race = await Promise.all(
    [a, b].map((user) =>
      replay(
        "checkout",
        {
          checkoutKey: randomUUID(),
          payment: { method: "CARD", cardId: user.cardId },
        },
        { token: user.token },
      ),
    ),
  );
  const outcomes = race
    .map((response) => response.result?.status ?? response.result?.code)
    .sort();
  const [remaining] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${last}`;
  check(
    "RACE_LAST_UNIT",
    "Two independent HTTP owners: one PAID, one OUT_OF_STOCK",
    `outcomes=${outcomes.join(",")}; remaining=${remaining.available_quantity}`,
    outcomes.join(",") === "OUT_OF_STOCK,PAID" &&
      remaining.available_quantity === 0,
  );
  const normal = data.products[0].id;
  await cart(a, normal, 2);
  const key = randomUUID();
  const input = {
    checkoutKey: key,
    payment: { method: "CARD", cardId: a.cardId },
  };
  const [before] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${normal}`;
  const repeated = await Promise.all([
    replay("checkout", input, { token: a.token }),
    replay("checkout", input, { token: a.token }),
  ]);
  const [after] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${normal}`;
  const intents =
    await sql`SELECT id FROM orders WHERE user_id=${a.id} AND checkout_key=${key}`;
  const [audit] =
    await sql`SELECT count(*)::int AS n FROM audit_events WHERE target_id=${intents[0]?.id} AND event_type='order.completed'`;
  check(
    "RACE_SAME_INTENT",
    "Same key returns one order, one decrement and one final event",
    `same=${repeated[0].result?.orderId === repeated[1].result?.orderId}; orders=${intents.length}; consumed=${before.available_quantity - after.available_quantity}; events=${audit.n}`,
    repeated.every((r) => r.result?.status === "PAID") &&
      repeated[0].result.orderId === repeated[1].result.orderId &&
      intents.length === 1 &&
      before.available_quantity - after.available_quantity === 2 &&
      audit.n === 1,
  );
  await cart(b, normal);
  const distinct = await Promise.all(
    [1, 2].map(() =>
      replay(
        "checkout",
        { checkoutKey: randomUUID(), payment: { method: "PIX" } },
        { token: b.token },
      ),
    ),
  );
  const pending = distinct.find((r) => r.result?.status === "PENDING_PAYMENT");
  const empty = distinct.find((r) => r.result?.code === "EMPTY_CART");
  check(
    "RACE_DISTINCT_INTENTS",
    "Same current cart converts once; other key sees empty cart",
    `pending=${!!pending}; empty=${!!empty}`,
    !!pending && !!empty,
  );
  assert.ok(pending?.result?.orderId);
  const orderId = pending.result.orderId;
  await sql`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 minutes',approvable_at=clock_timestamp()-interval '1 second' WHERE order_id=${orderId}`;
  const [stockBefore] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${normal}`;
  const confirmations = await Promise.all([
    replay("confirmPayment", { orderId }, { token: b.token }),
    replay("confirmPayment", { orderId }, { token: b.token }),
  ]);
  const [stockAfter] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${normal}`;
  const [finalEvents] =
    await sql`SELECT count(*)::int AS n FROM audit_events WHERE target_id=${orderId} AND event_type='order.completed'`;
  check(
    "RACE_PAYMENT",
    "Simultaneous confirmations return PAID and consume exactly once",
    `paid=${confirmations.every((r) => r.result?.status === "PAID")}; consumed=${stockBefore.available_quantity - stockAfter.available_quantity}; events=${finalEvents.n}`,
    confirmations.every((r) => r.result?.status === "PAID") &&
      stockBefore.available_quantity - stockAfter.available_quantity === 1 &&
      finalEvents.n === 1,
  );
  await cart(a, normal);
  const waiting = await replay(
    "checkout",
    { checkoutKey: randomUUID(), payment: { method: "PIX" } },
    { token: a.token },
  );
  assert.equal(waiting.result?.status, "PENDING_PAYMENT");
  const waitingId = waiting.result.orderId;
  await sql`UPDATE order_payments SET created_at=clock_timestamp()-interval '2 minutes',approvable_at=clock_timestamp()-interval '1 second' WHERE order_id=${waitingId}`;
  const [original] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${normal}`;
  const blocker = await sql.reserve();
  let promise;
  try {
    await blocker`BEGIN`;
    await blocker`UPDATE inventory SET available_quantity=0 WHERE product_id=${normal}`;
    promise = replay(
      "confirmPayment",
      { orderId: waitingId },
      { token: a.token },
    );
    let blocked = false;
    for (let i = 0; i < 100; i++) {
      const [state] =
        await sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%"inventory"%') AS blocked`;
      if (state.blocked) {
        blocked = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(blocked, "Actual database lock wait required");
    await blocker`COMMIT`;
  } finally {
    await blocker`ROLLBACK`;
    blocker.release();
  }
  const changed = await promise;
  check(
    "RACE_ADMIN_STOCK",
    "Payment rechecks inventory after controlled stock writer releases lock",
    `status=${changed.result?.status}`,
    changed.result?.status === "PAYMENT_FAILED",
  );
  await sql`UPDATE inventory SET available_quantity=${original.available_quantity} WHERE product_id=${normal}`;
  await assertIntegrity(sql);
} finally {
  await sql.end();
}
writeEvidence("task-10-concurrency", cases);
if (cases.some((c) => c.status === "FAIL")) process.exitCode = 1;
