import assert from "node:assert/strict";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

export async function prepareNavigation() {
  const lease = labLease();
  const data = JSON.parse(
    readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
  );
  const captures = JSON.parse(
    readFileSync(join(labDirectory, "captures.json"), "utf8"),
  );
  const buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
  assert.equal(data.runId, lease.runId);
  assert.equal(captures._meta?.runId, lease.runId);
  assert.equal(captures._meta?.buildId, buildId);
  assert.ok(
    Date.now() - Date.parse(data.preparedAt) < 60000,
    "Re-provision owned sessions before each campaign",
  );
  const sql = await openLabDb();
  try {
    const owned =
      await sql`SELECT id,email FROM users WHERE id IN ${sql(data.users.map((u) => u.id))} AND email LIKE ${`load-%.${lease.runId}@lab.example.test`}`;
    assert.equal(owned.length, 1000);
    const emails = new Map(owned.map((u) => [u.id, u.email]));
    // Offline provisioning of the already authorized, nonfinancial fixture only.
    await sql`INSERT INTO saved_test_cards(user_id,fixture_id,brand,last4,expiry_month,expiry_year) SELECT id,'test-1','TEST','0001',12,2099 FROM users WHERE id IN ${sql(data.users.map((u) => u.id))} ON CONFLICT(user_id,fixture_id) DO NOTHING`;
    const cards =
      await sql`SELECT id,user_id FROM saved_test_cards WHERE user_id IN ${sql(data.users.map((u) => u.id))} AND fixture_id='test-1'`;
    const ids = new Map(cards.map((c) => [c.user_id, c.id]));
    const [before] =
      await sql`SELECT clock_timestamp() AS prepared_at,available_quantity FROM inventory WHERE product_id=${data.productId}`;
    const path = join(labDirectory, "navigation-fixtures.json");
    if (existsSync(path))
      copyFileSync(
        path,
        join(labDirectory, `navigation-fixtures-before-${Date.now()}.json`),
      );
    writeFileSync(
      path,
      JSON.stringify({
        ...data,
        buildId,
        before,
        users: data.users.map((u) => ({
          ...u,
          email: emails.get(u.id),
          cardId: ids.get(u.id),
        })),
      }),
      { mode: 0o600 },
    );
    await assertIntegrity(sql);
    return {
      before,
      productId: data.productId,
      ids: data.users.map((u) => u.id),
    };
  } finally {
    await sql.end();
  }
}

export async function verifyNavigation(sql, snapshot, expectedOrders) {
  await assertIntegrity(sql);
  const [orders] =
    await sql`SELECT count(*)::int AS n,count(*) FILTER(WHERE status<>'PAID')::int AS not_paid,coalesce(sum(total_amount),0)::float8 AS total FROM orders WHERE user_id IN ${sql(snapshot.ids)} AND created_at>=${snapshot.before.prepared_at}`;
  assert.equal(
    orders.n,
    expectedOrders,
    "HTTP order successes must match persisted orders",
  );
  assert.equal(orders.not_paid, 0);
  const [items] =
    await sql`SELECT coalesce(sum(i.quantity),0)::int AS quantity FROM order_items i JOIN orders o ON i.order_id=o.id WHERE o.user_id IN ${sql(snapshot.ids)} AND o.created_at>=${snapshot.before.prepared_at} AND i.product_id=${snapshot.productId}`;
  const [stock] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${snapshot.productId}`;
  assert.equal(
    snapshot.before.available_quantity - stock.available_quantity,
    items.quantity,
  );
  const [audit] =
    await sql`SELECT count(*)::int AS n FROM audit_events a JOIN orders o ON a.target_id=o.id WHERE o.user_id IN ${sql(snapshot.ids)} AND o.created_at>=${snapshot.before.prepared_at} AND a.event_type='order.completed'`;
  assert.equal(audit.n, orders.n);
  const [actors] =
    await sql`SELECT count(*)::int AS n FROM audit_events a JOIN orders o ON a.target_id=o.id WHERE o.user_id IN ${sql(snapshot.ids)} AND o.created_at>=${snapshot.before.prepared_at} AND a.event_type='order.completed' AND a.actor_user_id IS DISTINCT FROM o.user_id`;
  assert.equal(actors.n, 0);
  return {
    orders: orders.n,
    stockConsumed: items.quantity,
    completionEvents: audit.n,
    incorrectAuditActors: actors.n,
  };
}
