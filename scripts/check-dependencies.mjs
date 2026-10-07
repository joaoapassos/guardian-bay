import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const policy = JSON.parse(
  readFileSync(".github/security/dependency-policy.json"),
);
const lock = JSON.parse(readFileSync("package-lock.json"));
try {
  assert.ok(
    new Date(`${policy.reviewBy}T23:59:59Z`) >= new Date(),
    "Tooling exception requires renewed review",
  );
  mkdirSync(".vitest", { recursive: true });
  let blocked = false;
  for (const production of [true, false]) {
    const args = ["audit", "--json", ...(production ? ["--omit=dev"] : [])];
    const run = spawnSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      args,
      {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        timeout: 120000,
      },
    );
    assert.ok(
      run.status === 0 || run.status === 1,
      "Audit service unavailable",
    );
    const report = JSON.parse(run.stdout);
    assert.ok(
      !report.error &&
        report.metadata?.vulnerabilities &&
        report.vulnerabilities,
      "Audit response invalid/unavailable",
    );
    const findings = [];
    for (const [name, finding] of Object.entries(report.vulnerabilities)) {
      const versions = (finding.nodes ?? []).map(
        (path) => lock.packages[path]?.version,
      );
      const accepted =
        !production &&
        finding.severity === policy.severity &&
        name in policy.packages &&
        versions.length > 0 &&
        versions.every((version) => version === policy.packages[name]) &&
        finding.via.every((via) =>
          typeof via === "string"
            ? via in policy.packages
            : via.url === policy.advisory,
        );
      // Unknown alerts await triage, not an automatic claim of exploitability.
      if (!accepted) blocked = true;
      findings.push({
        name,
        severity: finding.severity,
        decision: accepted
          ? "accepted risk (tooling scope, dated review)"
          : "pending triage; merge blocked",
      });
    }
    const scope = production ? "production" : "all";
    writeFileSync(
      `.vitest/dependencies-${scope}.json`,
      `${JSON.stringify({ scope, findings }, null, 2)}\n`,
    );
    console.info(
      `${scope}: ${findings.length} findings; ${findings.filter((finding) => finding.decision.startsWith("pending")).length} pending triage.`,
    );
  }
  if (blocked) {
    console.error(
      "Dependency findings need contextual review; no automatic fixes were applied.",
    );
    process.exitCode = 1;
  }
} catch {
  console.error(
    "Dependency gate unavailable/invalid or accepted-risk review expired. Merge evidence is incomplete; inspect registry connectivity and policy.",
  );
  process.exitCode = 1;
}
