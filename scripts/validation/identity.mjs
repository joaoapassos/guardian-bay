import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, replay, transport } from "./http.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const data = fixtures();
const a = data.users.find((u) => u.name === "a");
const b = data.users.find((u) => u.name === "b");
const admin = data.users.find((u) => u.name === "admin");
const cases = [];
const check = (id, expected, observed, passed) => {
  cases.push({ id, expected, observed, status: passed ? "PASS" : "FAIL" });
};
const sql = await openLabDb();
try {
  const visitor = await transport("/account");
  check(
    "IDENTITY_VISITOR",
    "Anonymous account redirects without fixture identity",
    `HTTP ${visitor.status}; public-only=${!data.users.some((u) => visitor.text.includes(u.email) || visitor.text.includes(u.token))}`,
    visitor.status === 307 &&
      !data.users.some(
        (u) => visitor.text.includes(u.email) || visitor.text.includes(u.token),
      ),
  );
  const own = await transport("/account", { token: a.token });
  check(
    "IDENTITY_POSITIVE",
    "Owner identity visible, other identity absent",
    `HTTP ${own.status}; own=${own.text.includes(a.email)}; other=${own.text.includes(b.email)}`,
    own.status === 200 &&
      own.text.includes(a.email) &&
      !own.text.includes(b.email),
  );
  const denied = await transport("/admin/orders", { token: a.token });
  const allowed = await transport("/admin/orders", { token: admin.token });
  check(
    "ACCESS_VERTICAL",
    "Customer denied and admin positive control succeeds",
    `customer=${denied.status}; admin=${allowed.status}`,
    denied.status === 404 && allowed.status === 200,
  );
  const [order] =
    await sql`SELECT id FROM orders WHERE user_id=${a.id} ORDER BY created_at DESC LIMIT 1`;
  assert.ok(order);
  const cross = await transport(`/orders/${order.id}`, { token: b.token });
  const ownOrder = await transport(`/orders/${order.id}`, { token: a.token });
  const confirmation = await replay(
    "confirmPayment",
    { orderId: order.id },
    { token: b.token },
  );
  check(
    "ACCESS_ORDER_BOLA",
    "Other owner cannot read or confirm A order",
    `otherRead=${cross.status}; ownRead=${ownOrder.status}; confirm=${confirmation.result?.code}`,
    cross.status === 404 &&
      ownOrder.status === 200 &&
      confirmation.result?.code === "NOT_FOUND",
  );
  const removal = await replay(
    "removeCard",
    { cardId: a.cardId },
    { token: b.token },
  );
  const cards =
    await sql`SELECT id FROM saved_test_cards WHERE id=${a.cardId} AND user_id=${a.id}`;
  check(
    "ACCESS_CARD_BOLA",
    "Idempotent response cannot remove another owner's card",
    `responseSuccess=${removal.result?.success}; ownerRows=${cards.length}`,
    removal.result?.success === true && cards.length === 1,
  );
  const positive = await replay(
    "removeCard",
    { cardId: randomUUID() },
    { token: a.token },
  );
  assert.equal(positive.result?.success, true);
  for (const [name, origin] of [
    ["MISSING", ""],
    ["OPAQUE", "null"],
    ["FOREIGN", "https://attacker.invalid"],
    ["DOWNGRADE", "http://127.0.0.1:3449"],
  ]) {
    const response = await replay(
      "removeCard",
      { cardId: a.cardId },
      { token: a.token, origin },
    );
    check(
      `CSRF_${name}`,
      "Invalid origin rejected without mutation",
      `HTTP ${response.status}`,
      response.status >= 400,
    );
  }
  const forwarded = await replay(
    "removeCard",
    { cardId: randomUUID() },
    { token: a.token, headers: { "x-forwarded-host": "attacker.invalid" } },
  );
  check(
    "CSRF_FORWARDED",
    "Proxy strips forwarded authority; valid operation remains valid",
    `success=${forwarded.result?.success}`,
    forwarded.result?.success === true,
  );
  const oversized = await replay(
    "removeCard",
    { cardId: a.cardId, padding: "x".repeat(20 * 1024) },
    { token: a.token },
  );
  check(
    "CSRF_BODY_LIMIT",
    "Oversized Action rejected",
    `HTTP ${oversized.status}`,
    oversized.status >= 400,
  );
  const wrong = await replay("login", {
    email: b.email,
    password: "Wrong synthetic passphrase",
  });
  const unknown = await replay("login", {
    email: `${randomUUID()}@lab.example.test`,
    password: "Wrong synthetic passphrase",
  });
  check(
    "AUTH_ENUMERATION",
    "Unknown and wrong credentials give equivalent public result",
    `equivalent=${JSON.stringify(wrong.result) === JSON.stringify(unknown.result)}`,
    wrong.result?.success === false &&
      JSON.stringify(wrong.result) === JSON.stringify(unknown.result),
  );
  await sql`DELETE FROM sessions WHERE user_id=${b.id}`; // Owned fixture only: controlled revocation, not an auth bypass.
  const revoked = await replay(
    "removeCard",
    { cardId: b.cardId },
    { token: b.token },
  );
  check(
    "SESSION_REPLAY",
    "Revoked fixture session cannot mutate",
    `code=${revoked.result?.code}`,
    revoked.result?.code === "UNAUTHENTICATED",
  );
  await assertIntegrity(sql);
  check(
    "IDENTITY_INTEGRITY",
    "Global commercial invariants preserved",
    "All integrity counters zero",
    true,
  );
} finally {
  await sql.end();
}
cases.push({
  id: "BURP_OPERATOR",
  expected: "Human operator repeats cases in Burp Community",
  observed: "Reproducible guide delivered; no human Burp session executed here",
  status: "LIMITATION",
});
writeEvidence("task-07-identity", cases);
if (cases.some((c) => c.status === "FAIL")) process.exitCode = 1;
