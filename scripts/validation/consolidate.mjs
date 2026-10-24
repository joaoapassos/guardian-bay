import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const folder = join(labDirectory, "reports");
const reports = readdirSync(folder)
  .filter((name) => /^task-\d{2}-[a-z0-9-]+\.json$/.test(name))
  .sort()
  .map((name) => {
    const report = JSON.parse(readFileSync(join(folder, name), "utf8"));
    assert.equal(report.runId, lease.runId);
    // These are scenario summaries only. Never publish captures, cookies or tool debug logs.
    for (const item of report.cases) {
      assert.ok(
        !/set-cookie|password_hash|authorization:|\b[0-9a-f]{64}\b/i.test(
          `${item.expected} ${item.observed}`,
        ),
      );
    }
    return report;
  });
const counts = {};
for (const report of reports)
  for (const item of report.cases)
    counts[item.status] = (counts[item.status] ?? 0) + 1;
writeFileSync(
  "docs/validation/results.json",
  `${JSON.stringify(
    {
      schemaVersion: 1,
      runId: lease.runId,
      verdict: "NOT_APPROVED_PENDING_RETESTS",
      counts,
      limitations: [
        "Production Zod High advisory remains unresolved; capacity and stress were blocked before traffic.",
        "Burp Community human execution remains pending; HTTP replay is not a substitute.",
        "Natural 24-hour boleto expiration and timing side channels were not measured.",
        "ZAP active coverage was limited to two GET rules; no complete WSTG/ASVS claim.",
        "Two-user short calibration does not establish supported capacity or DDoS resistance.",
      ],
      reports,
    },
    null,
    2,
  )}\n`,
);
console.info(JSON.stringify(counts));
