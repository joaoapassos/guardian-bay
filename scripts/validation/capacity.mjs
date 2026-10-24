import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { selectedLevel } from "./diagnostic-contract.mjs";
import { writeEvidence } from "./evidence.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";
import { supervise } from "./supervision.mjs";

const level = selectedLevel(process.argv[2]);
labLease();
const scaPath = ".vitest/dependencies-production.json";
const sca = JSON.parse(readFileSync(scaPath, "utf8"));
const cases = [];
if (sca.findings.length) {
  writeEvidence("task-12-capacity", [
    {
      id: "CAPACITY_SCA_PREFLIGHT",
      expected:
        "No unresolved production dependency findings before escalation",
      observed: `${sca.findings.length} unresolved production finding; no capacity traffic sent`,
      status: "INCONCLUSIVE",
    },
  ]);
  process.exitCode = 2;
} else {
  assert.ok(
    Date.now() - statSync(scaPath).mtimeMs < 15 * 60 * 1000,
    "Fresh SCA evidence required before campaign",
  );
  const load = JSON.parse(
    readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
  );
  assert.equal(load.runId, labLease().runId);
  const sql = await openLabDb();
  try {
    // Provisioning-only session refresh. This workload does not measure login/idle expiry.
    await sql`UPDATE sessions SET last_active_at=clock_timestamp() WHERE user_id IN ${sql(load.users.map((u) => u.id))} AND expires_at>clock_timestamp()`;
    const launch = (vus, seconds, workload) =>
      new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "scripts/validation/performance.mjs",
            String(vus),
            String(seconds),
            workload,
          ],
          {
            stdio: "inherit",
            windowsHide: true,
            env: { ...process.env, LAB_EVIDENCE_PHASE: "capacity" },
          },
        );
        supervise(child);
        child.on("error", reject);
        child.on("exit", resolve);
      });
    let stopped = false;
    for (const vus of [level]) {
      for (const workload of ["read", "commerce"]) {
        if (stopped) break;
        const warmup = await launch(vus, 15, workload);
        if (warmup !== 0) {
          cases.push({
            id: `CAPACITY_${workload.toUpperCase()}_${vus}`,
            expected: "Warmup and measured plateau pass before escalation",
            observed: `Warmup failed with exit ${warmup}; higher traffic not sent`,
            status: "FAIL",
          });
          stopped = true;
          break;
        }
        const measured = await launch(vus, 60, workload);
        const report = JSON.parse(
          readFileSync(
            join(
              labDirectory,
              "reports",
              `task-12-perf-${workload}-${vus}.json`,
            ),
            "utf8",
          ),
        );
        const metrics = report.metrics;
        const safe =
          measured === 0 &&
          metrics.unexpectedFailureRate < 0.01 &&
          metrics.maxMemoryPercent < 85 &&
          metrics.maxConnections < 80 &&
          metrics.maxCpuPercent < 90 &&
          metrics.maxLockWaiters === 0;
        cases.push({
          id: `CAPACITY_${workload.toUpperCase()}_${vus}`,
          expected: "Measured plateau, resource limits and integrity pass",
          observed: `exit=${measured}; p95=${metrics.p95.toFixed(2)}ms; p99=${metrics.p99.toFixed(2)}ms; rps=${metrics.rps.toFixed(2)}; safe=${safe}`,
          status: safe ? "PASS" : "FAIL",
        });
        if (!safe) stopped = true;
      }
      if (stopped) break;
    }
    await assertIntegrity(sql);
    writeEvidence("task-12-capacity", cases);
    if (cases.some((c) => c.status === "FAIL")) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
