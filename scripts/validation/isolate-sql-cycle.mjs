import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import postgres from "postgres";
import { databaseUrl, labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const lease = labLease();
const fixtures = JSON.parse(
  readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
);
assert.equal(fixtures.runId, lease.runId);
const guard = await openLabDb();
const summaries = [];
try {
  for (const pipeline of [100, 1]) {
    const clients = Array.from({ length: 4 }, () =>
      postgres(databaseUrl, {
        max: 10,
        max_pipeline: pipeline,
        onnotice: () => {},
        connection: {
          default_transaction_read_only: "on",
          statement_timeout: "2000",
        },
      }),
    );
    let expired = false;
    const deadline = setTimeout(() => {
      expired = true;
      for (const client of clients) void client.end({ timeout: 1 });
    }, 15000);
    try {
      // Open and exercise all40connections before measuring; no app running.
      for (const client of clients) {
        const reserved = await Promise.all(
          Array.from({ length: 10 }, () => client.reserve()),
        );
        await Promise.all(reserved.map((c) => c`SELECT 1`));
        for (const c of reserved) c.release();
      }
      const times = [];
      const start = performance.now();
      await Promise.all(
        Array.from({ length: 250 }, async (_, i) => {
          const sql = clients[i % clients.length];
          const hash = createHash("sha256")
            .update(fixtures.users[i].token)
            .digest("hex");
          const began = performance.now();
          const session = () =>
            sql`SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${hash} AND s.expires_at>CURRENT_TIMESTAMP AND s.last_active_at>CURRENT_TIMESTAMP-interval '30 minutes' LIMIT 1`;
          assert.equal((await session()).length, 1);
          if (i % 2 === 0) {
            await sql`SELECT DISTINCT c.id,c.name FROM categories c JOIN products p ON p.category_id=c.id WHERE p.is_published=true ORDER BY c.name,c.id LIMIT 100`;
            await sql`SELECT p.id,p.name,p.amount,p.currency,c.name,i.available_quantity FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN inventory i ON i.product_id=p.id WHERE p.is_published=true ORDER BY p.name,p.id LIMIT 21`;
          } else {
            assert.equal((await session()).length, 1);
            await sql`SELECT c.id,c.brand,c.last4,c.expiry_month,c.expiry_year FROM saved_test_cards c JOIN sessions s ON s.user_id=c.user_id WHERE s.token_hash=${hash} AND s.expires_at>CURRENT_TIMESTAMP AND s.last_active_at>CURRENT_TIMESTAMP-interval '30 minutes' ORDER BY c.created_at LIMIT 3`;
          }
          times.push(performance.now() - began);
        }),
      );
      assert.equal(expired, false);
      times.sort((a, b) => a - b);
      summaries.push({
        pipeline,
        pools: 4,
        maxConnectionsPerPool: 10,
        jobs: 250,
        selects: 750,
        wallMs: performance.now() - start,
        p50Ms: times[124],
        p95Ms: times[237],
        p99Ms: times[247],
        maxMs: times.at(-1),
      });
    } finally {
      clearTimeout(deadline);
      await Promise.all(clients.map((c) => c.end({ timeout: 2 })));
    }
  }
  await assertIntegrity(guard);
  writeFileSync(
    `docs/validation/epic13-sql-isolation-${Date.now()}.json`,
    `${JSON.stringify({ runId: lease.runId, scope: "Read-only synthetic250jobs/750SELECTs, four pools in one Node process, no SSR/HTTP/Drizzle; not application capacity. Variants sequential and fixed order; exploratory comparison only.", summaries }, null, 2)}\n`,
  );
  console.info(JSON.stringify(summaries));
} finally {
  await guard.end();
}
