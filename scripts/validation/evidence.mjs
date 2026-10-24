import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";

const decisions = [
  "PASS",
  "FAIL",
  "INCONCLUSIVE",
  "LIMITATION",
  "ACCEPTED_RISK",
];
export function writeEvidence(task, cases, metrics = {}) {
  const lease = labLease();
  assert.match(task, /^task-\d{2}-[a-z0-9-]+$/);
  const clean = cases.map((item) => {
    assert.deepEqual(Object.keys(item).sort(), [
      "expected",
      "id",
      "observed",
      "status",
    ]);
    assert.match(item.id, /^[A-Z0-9_-]{2,80}$/);
    assert.ok(decisions.includes(item.status));
    for (const field of ["expected", "observed"]) {
      assert.equal(typeof item[field], "string");
      assert.ok(item[field].length <= 1000);
      assert.ok(
        !/\b[0-9a-f]{64}\b|password_hash|set-cookie|authorization:|postgres(?:ql)?:\/\//i.test(
          item[field],
        ),
        "Sensitive evidence must be redacted before writing",
      );
    }
    return item;
  });
  const source = spawnSync("git", ["rev-parse", "HEAD:src"], {
    encoding: "utf8",
  });
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  assert.equal(source.status, 0);
  assert.equal(head.status, 0);
  // Metrics are numbers only. No arbitrary response/request payload.
  for (const [name, value] of Object.entries(metrics)) {
    assert.match(name, /^[a-zA-Z0-9_]+$/);
    assert.ok(Number.isFinite(value));
  }
  const report = {
    schemaVersion: 1,
    task,
    runId: lease.runId,
    capturedAt: new Date().toISOString(),
    harnessSha: head.stdout.trim(),
    sourceTree: source.stdout.trim(),
    buildId: existsSync(".next/BUILD_ID")
      ? readFileSync(".next/BUILD_ID", "utf8").trim()
      : null,
    cases: clean,
    metrics,
  };
  const folder = join(labDirectory, "reports");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, `${task}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.info(
    JSON.stringify({
      task,
      counts: Object.fromEntries(
        decisions.map((status) => [
          status,
          clean.filter((item) => item.status === status).length,
        ]),
      ),
      metrics,
    }),
  );
  return report;
}
