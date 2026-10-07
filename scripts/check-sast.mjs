import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  mkdirSync(".vitest", { recursive: true });
  const binary =
    process.env.SEMGREP_PATH ||
    resolve(".vitest/tools/semgrep-venv/bin/semgrep");
  const env = {
    ...process.env,
    SEMGREP_SEND_METRICS: "off",
    SEMGREP_ENABLE_VERSION_CHECK: "0",
    SEMGREP_SETTINGS_FILE: resolve(".vitest/semgrep-settings.yml"),
    SEMGREP_LOG_FILE: resolve(".vitest/semgrep.log"),
    SEMGREP_VERSION_CACHE_PATH: resolve(".vitest/semgrep-version"),
  };
  const version = spawnSync(binary, ["--version"], { encoding: "utf8", env });
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), "1.140.0");
  const scan = spawnSync(
    binary,
    [
      "scan",
      "--config",
      ".semgrep.yml",
      "--strict",
      "--error",
      "--metrics=off",
      "--disable-version-check",
      "--json",
      "src",
      "scripts",
      "next.config.ts",
      "drizzle.config.ts",
    ],
    { encoding: "utf8", env, maxBuffer: 8 * 1024 * 1024, timeout: 120000 },
  );
  assert.ok(scan.status === 0 || scan.status === 1);
  const result = JSON.parse(scan.stdout);
  assert.equal(
    result.errors?.length ?? 0,
    0,
    "SAST parse/tool errors require review",
  );
  assert.ok(result.paths.scanned.length > 0, "No files scanned");
  const findings = result.results.map((finding) => ({
    rule: finding.check_id,
    path: finding.path,
    line: finding.start.line,
    decision: "pending triage",
    message: finding.extra.message,
  }));
  mkdirSync(".vitest", { recursive: true });
  writeFileSync(
    ".vitest/sast.json",
    `${JSON.stringify({ scanned: result.paths.scanned.length, findings }, null, 2)}\n`,
  );
  console.info(
    `Semgrep: ${result.paths.scanned.length} files; ${findings.length} findings pending contextual review.`,
  );
  if (findings.length) process.exitCode = 1;
} catch {
  console.error(
    "SAST gate failed/unavailable. Review tool version, configuration and parser errors; no source payload was printed.",
  );
  process.exitCode = 1;
}
