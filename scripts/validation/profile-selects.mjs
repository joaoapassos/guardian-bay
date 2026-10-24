import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const lease = labLease();
const data = JSON.parse(
  readFileSync(join(labDirectory, "representative-fixtures.json"), "utf8"),
);
if (data.runId !== lease.runId) throw new Error("Mismatched fixtures");
const user = data.users[0];
const hash = createHash("sha256").update(user.token).digest("hex");
const sql = await openLabDb();
try {
  const plans = await sql.begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;
    await tx`SET LOCAL statement_timeout='2s'`;
    return [
      [
        "session",
        await tx`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${hash} AND s.expires_at>CURRENT_TIMESTAMP AND s.last_active_at>CURRENT_TIMESTAMP-interval '30 minutes' LIMIT 1`,
      ],
      [
        "published-page-projection",
        await tx`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id,name,amount FROM products WHERE is_published=true ORDER BY id LIMIT 20`,
      ],
      [
        "own-history-projection",
        await tx`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id,status,total_amount FROM orders WHERE user_id=${user.id} ORDER BY created_at DESC,id DESC LIMIT 20`,
      ],
    ];
  });
  const summaries = plans.map(([name, rows]) => {
    const plan = rows[0]["QUERY PLAN"][0];
    const nodes = [];
    const visit = (node) => {
      nodes.push(node["Node Type"]);
      for (const child of node.Plans ?? []) visit(child);
    };
    visit(plan.Plan);
    return {
      name,
      planningMs: plan["Planning Time"],
      executionMs: plan["Execution Time"],
      actualRows: plan.Plan["Actual Rows"],
      sharedHitBlocks: plan.Plan["Shared Hit Blocks"] ?? 0,
      sharedReadBlocks: plan.Plan["Shared Read Blocks"] ?? 0,
      nodeTypes: nodes,
    };
  });
  await assertIntegrity(sql);
  const [settings] =
    await sql`SELECT current_setting('max_connections')::int AS max_connections, current_setting('shared_buffers') AS shared_buffers,version() LIKE 'PostgreSQL 18.6%' AS postgres_18_6`;
  writeFileSync(
    "docs/validation/epic13-select-profile.json",
    `${JSON.stringify({ runId: lease.runId, at: new Date().toISOString(), scope: "Single-user read-only samples; projections are not complete application traces or production-cardinality plans", settings, summaries }, null, 2)}\n`,
  );
  console.info(
    "Three fixed read-only plans sampled; only numeric aggregates and plan node types exported.",
  );
} finally {
  await sql.end();
}
