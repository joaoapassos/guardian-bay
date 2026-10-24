import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeEvidence } from "./evidence.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const data = JSON.parse(
  readFileSync(join(labDirectory, "representative-fixtures.json"), "utf8"),
);
assert.equal(data.runId, labLease().runId);
assert.equal(data.buildId, readFileSync(".next/BUILD_ID", "utf8").trim());
const sql = await openLabDb();
try {
  await assertIntegrity(sql);
  const ids = data.users.map((u) => u.id);
  const rows =
    await sql`SELECT p.method,o.status,count(*)::int AS n FROM orders o JOIN order_payments p ON p.order_id=o.id WHERE o.user_id IN ${sql(ids)} AND o.created_at>=${data.before.prepared_at} GROUP BY p.method,o.status ORDER BY p.method`;
  assert.deepEqual(
    rows.map((r) => ({ ...r })),
    ["BOLETO", "CARD", "PIX"].map((method) => ({
      method,
      status: "PAID",
      n: 2,
    })),
  );
  const [stock] =
    await sql`SELECT available_quantity FROM inventory WHERE product_id=${data.productId}`;
  assert.equal(data.before.available_quantity - stock.available_quantity, 6);
  const [audit] =
    await sql`SELECT count(*)::int AS n FROM audit_events a JOIN orders o ON a.target_id=o.id WHERE o.user_id IN ${sql(ids)} AND o.created_at>=${data.before.prepared_at} AND a.event_type='order.completed'`;
  assert.equal(audit.n, 6);
  const report = writeEvidence(
    "task-07-representative-integrity",
    [
      {
        id: "REPRESENTATIVE_INTEGRITY",
        expected:
          "Six PAID orders, two per method, six stock units and six completion events",
        observed:
          "PostgreSQL matches all expected counts; global integrity checks hold",
        status: "PASS",
      },
    ],
    { paidOrders: 6, stockConsumed: 6, completionEvents: 6 },
  );
  writeFileSync(
    "docs/validation/epic13-representative-integrity.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
} finally {
  await sql.end();
}
