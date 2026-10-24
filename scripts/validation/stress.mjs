import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { recoveryPassed } from "./diagnostic-contract.mjs";
import { writeEvidence } from "./evidence.mjs";
import { transport } from "./http.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";
import { supervise } from "./supervision.mjs";

labLease();
const sca = JSON.parse(
  readFileSync(".vitest/dependencies-production.json", "utf8"),
);
const capacityPath = join(labDirectory, "reports/task-12-capacity.json");
const capacity = existsSync(capacityPath)
  ? JSON.parse(readFileSync(capacityPath, "utf8"))
  : null;
const levels = [10, 50, 100, 500, 1000];
const stable = levels.filter(
  (vus) =>
    capacity?.cases.some(
      (c) => c.id === `CAPACITY_READ_${vus}` && c.status === "PASS",
    ) &&
    capacity?.cases.some(
      (c) => c.id === `CAPACITY_COMMERCE_${vus}` && c.status === "PASS",
    ),
);
if (
  sca.findings.length ||
  !stable.length ||
  capacity.runId !== labLease().runId
) {
  writeEvidence("task-13-stress", [
    {
      id: "STRESS_PREFLIGHT",
      expected: "Clean SCA and a measured stable plateau before stress",
      observed: `productionFindings=${sca.findings.length}; stablePlateaus=${stable.length}; no stress traffic sent`,
      status: "INCONCLUSIVE",
    },
  ]);
  process.exitCode = 2;
} else {
  const base = Math.max(...stable);
  const peak = levels.find((value) => value > base) ?? base;
  const baseline = JSON.parse(
    readFileSync(
      join(labDirectory, "reports", `task-12-perf-read-${base}.json`),
      "utf8",
    ),
  );
  const launch = (vus, seconds) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "scripts/validation/performance.mjs",
          String(vus),
          String(seconds),
          "read",
        ],
        {
          stdio: "inherit",
          windowsHide: true,
          env: { ...process.env, LAB_EVIDENCE_PHASE: "stress" },
        },
      );
      supervise(child);
      child.on("error", reject);
      child.on("exit", resolve);
    });
  assert.equal(
    await launch(base, 30),
    0,
    "Baseline no longer stable; do not spike",
  );
  const spikeCode = await launch(peak, 10);
  const latencies = [];
  const started = Date.now();
  let recovered = false;
  while (Date.now() - started < 120000) {
    const begin = performance.now();
    const response = await transport("/products");
    const elapsed = performance.now() - begin;
    latencies.push({ status: response.status, ms: elapsed });
    if (recoveryPassed(latencies, baseline.metrics.p95)) {
      recovered = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const sql = await openLabDb();
  try {
    await assertIntegrity(sql);
  } finally {
    await sql.end();
  }
  writeEvidence(
    "task-13-stress",
    [
      {
        id: "STRESS_PEAK",
        expected: "Bounded spike reports thresholds and resource outcome",
        observed: `base=${base}; peak=${peak}; exit=${spikeCode}; no claim of DDoS resistance`,
        status: spikeCode === 0 ? "PASS" : "FAIL",
      },
      {
        id: "STRESS_RECOVERY",
        expected:
          "Ten read samples within 20% of baseline p95 in two minutes, integrity preserved",
        observed: `recovered=${recovered}; seconds=${((Date.now() - started) / 1000).toFixed(2)}`,
        status: recovered ? "PASS" : "FAIL",
      },
    ],
    { base, peak, recoverySeconds: (Date.now() - started) / 1000 },
  );
  if (!recovered || spikeCode !== 0) process.exitCode = 1;
}
