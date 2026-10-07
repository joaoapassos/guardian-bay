import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// Scan only Git-indexed files and their current working contents, including staged additions.
const temporary = mkdtempSync(join(tmpdir(), "guardian-secrets-"));
try {
  const binary = process.env.GITLEAKS_PATH || resolve(".vitest/tools/gitleaks");
  const version = spawnSync(binary, ["version"], { encoding: "utf8" });
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), "8.24.3");
  const git = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  assert.equal(git.status, 0);
  const files = git.stdout.split("\0").filter(Boolean);
  for (const file of files) {
    assert.ok(
      !/(^|\/)\.env[^/]*$/.test(file) || file === ".env.example",
      "Real env file tracked",
    );
    assert.ok(
      !/(^|\/)(\.aws|\.ssh)(\/|$)|(^|\/)(id_rsa|id_ed25519|credentials(?:\.json)?|service-account[^/]*\.json)$|\.(pem|key|p12|pfx)$/.test(
        file,
      ),
      "Sensitive credential file tracked",
    );
    assert.ok(
      !lstatSync(file).isSymbolicLink(),
      "Tracked symlink requires explicit review",
    );
    const destination = join(temporary, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }
  for (const line of readFileSync(".env.example", "utf8").split("\n")) {
    if (/^\s*(?:#|$)/.test(line)) continue;
    assert.match(
      line,
      /^[A-Z][A-Z0-9_]*=\s*$/,
      "Env template values must remain empty",
    );
  }
  const scan = spawnSync(
    binary,
    [
      "dir",
      temporary,
      "--config",
      resolve(".gitleaks.toml"),
      "--no-banner",
      "--redact=100",
      "--exit-code",
      "1",
    ],
    { encoding: "utf8" },
  );
  // Gitleaks redacts evidence; report locations/rules without raw matched values.
  if (scan.status !== 0) {
    console.error(scan.stderr);
    throw new Error("Secret scan finding or scanner failure");
  }
  console.info(
    `Gitleaks: ${files.length} indexed files scanned; no untriaged secrets.`,
  );
} catch {
  console.error(
    "Secret gate failed/unavailable. Review redacted locations and indexed sensitive files; do not print secret values.",
  );
  process.exitCode = 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
