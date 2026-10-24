import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { databaseUrl, labDirectory, labLease } from "./scope.mjs";

export async function openLabDb() {
  labLease();
  const sql = postgres(databaseUrl, {
    max: 3,
    onnotice: () => {},
    connection: { application_name: "guardian-epic12-validation" },
  });
  try {
    const [cluster] =
      await sql`SELECT current_setting('data_directory') AS directory, inet_server_port() AS port`;
    const normalize = (path) =>
      realpathSync(path).replaceAll("\\", "/").toLowerCase();
    assert.equal(
      normalize(cluster.directory),
      normalize(join(labDirectory, "postgres")),
    );
    assert.equal(cluster.port, 55442);
    return sql;
  } catch (error) {
    await sql.end();
    throw error;
  }
}

export async function assertIntegrity(sql) {
  const [result] = await sql`SELECT
    (SELECT count(*)::int FROM inventory WHERE available_quantity < 0) AS negative_stock,
    (SELECT count(*)::int FROM orders o LEFT JOIN (SELECT order_id,sum(subtotal_amount) AS amount,count(*) AS n FROM order_items GROUP BY order_id) i ON i.order_id=o.id WHERE i.n IS NULL OR i.amount<>o.total_amount) AS bad_totals,
    (SELECT count(*)::int FROM order_payments p JOIN orders o ON o.id=p.order_id WHERE (p.status='APPROVED' AND o.status<>'PAID') OR (p.status='PENDING' AND o.status<>'PENDING_PAYMENT') OR (p.status='DECLINED' AND o.status<>'PAYMENT_FAILED') OR (p.status='EXPIRED' AND o.status<>'PAYMENT_EXPIRED')) AS inconsistent_payment,
    (SELECT count(*)::int FROM (SELECT user_id,checkout_key FROM orders GROUP BY user_id,checkout_key HAVING count(*)>1) d) AS duplicate_intents`;
  assert.deepEqual(result, {
    negative_stock: 0,
    bad_totals: 0,
    inconsistent_payment: 0,
    duplicate_intents: 0,
  });
  return result;
}
