import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { transport } from "./http.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { openLabDb } from "./state.mjs";

const lease = labLease();
const data = JSON.parse(
  readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
);
assert.equal(data.runId, lease.runId);
const sql = await openLabDb();
const topology = JSON.parse(
  readFileSync(join(labDirectory, "processes.json"), "utf8"),
);
const instanceCount = (topology.apps ?? [topology.app]).length;
assert.ok([1, 2, 4, 8].includes(instanceCount));
const warmRequestsPerRoute = 20 * instanceCount;
try {
  await sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
  const snapshot = () =>
    sql`SELECT queryid::text AS id, query, calls::float8 AS calls,total_exec_time FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database()) AND query NOT LIKE '%pg_stat_statements%' AND query ILIKE 'select%'`;
  const groups = [];
  for (const route of ["/products", "/account"]) {
    for (let warm = 0; warm < warmRequestsPerRoute; warm++)
      assert.equal(
        (await transport(route, { token: data.users[0].token })).status,
        200,
      );
    const before = new Map((await snapshot()).map((r) => [r.id, r]));
    const durations = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      assert.equal(
        (await transport(route, { token: data.users[0].token })).status,
        200,
      );
      durations.push(performance.now() - start);
    }
    const changes = (await snapshot())
      .map((r) => ({
        bucket: r.query.includes('"sessions"')
          ? "session-protected-read"
          : r.query.includes('"saved_test_cards"')
            ? "owned-test-cards"
            : "other-select",
        calls: r.calls - (before.get(r.id)?.calls ?? 0),
        executionMs:
          r.total_exec_time - (before.get(r.id)?.total_exec_time ?? 0),
      }))
      .filter((r) => r.calls > 0);
    groups.push({
      route,
      requests: 20,
      averageHttpMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      selectCalls: changes.reduce((n, r) => n + r.calls, 0),
      databaseExecutionMs: changes.reduce((n, r) => n + r.executionMs, 0),
      changes,
    });
  }
  writeFileSync(
    `docs/validation/epic13-request-sql-${Date.now()}.json`,
    `${JSON.stringify({ runId: lease.runId, instanceCount, warmRequestsPerRoute, buildId: readFileSync(".next/BUILD_ID", "utf8").trim(), scope: "20 sequential requests per route, one owned user, explicit warm-up per instance; SQL execution excludes network and pool acquisition; not a concurrent capacity test", groups }, null, 2)}\n`,
  );
  console.info(JSON.stringify(groups));
} finally {
  await sql.end();
}
