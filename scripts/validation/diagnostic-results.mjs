import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const manifests = readdirSync(labDirectory)
  .filter((n) => n.startsWith("perf-read-"))
  .flatMap((n) => {
    const path = join(labDirectory, n, "manifest.json");
    return existsSync(path) ? [JSON.parse(readFileSync(path, "utf8"))] : [];
  });
const rows = readdirSync(join(labDirectory, "observability"))
  .filter((n) => n.startsWith(lease.runId))
  .flatMap((n) =>
    readFileSync(join(labDirectory, "observability", n), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
  );
const experiments = readdirSync(join(labDirectory, "reports"))
  .filter((n) => /^task-02-diag-[a-z0-9-]+\.json$/.test(n))
  .sort()
  .map((n) => {
    const report = JSON.parse(
      readFileSync(join(labDirectory, "reports", n), "utf8"),
    );
    assert.equal(report.runId, lease.runId);
    const manifest = manifests
      .filter(
        (m) =>
          m.diagnostic &&
          report.task ===
            `task-02-diag-${m.diagnostic.transport}-${m.diagnostic.route}-${m.diagnostic.ramp}-${m.vus}` &&
          Date.parse(m.at) <= Date.parse(report.capturedAt),
      )
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    assert.ok(manifest);
    const window = rows.filter(
      (r) =>
        Date.parse(r.at) >= Date.parse(manifest.at) &&
        Date.parse(r.at) <= Date.parse(report.capturedAt),
    );
    const runtime = Object.fromEntries(
      ["proxy", "app"].map((role) => {
        const samples = window.filter((r) => r.role === role);
        return [
          role,
          {
            samples: samples.length,
            maxEventLoopUtilization: Math.max(
              0,
              ...samples.map((r) => r.eventLoopUtilization),
            ),
            maxEventLoopP99Ms: Math.max(
              0,
              ...samples.map((r) => r.eventLoopP99Ms),
            ),
          },
        ];
      }),
    );
    return { ...report, manifest, runtime };
  });
writeFileSync(
  "docs/validation/epic13-diagnostic-results.json",
  `${JSON.stringify({ runId: lease.runId, experiments, limitations: ["Same physical Windows host; no isolated generator comparison", "Short diagnostics; not sustained capacity", "Raw runtime/error logs remain private", "Manifest trackedDirty identifies harness code under development before the Task02 commit"] }, null, 2)}\n`,
);
console.info(
  JSON.stringify({
    experiments: experiments.length,
    pass: experiments.filter((r) => r.cases.every((c) => c.status === "PASS"))
      .length,
  }),
);
