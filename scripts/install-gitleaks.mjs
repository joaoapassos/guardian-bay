import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Release checksum verified against the publisher's v8.24.3 checksums manifest.
const checksum =
  "9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c";
try {
  assert.equal(process.platform, "linux", "Installer supports Linux x64 CI");
  assert.equal(process.arch, "x64");
  const directory = resolve(".vitest/tools");
  mkdirSync(directory, { recursive: true });
  const response = await fetch(
    "https://github.com/gitleaks/gitleaks/releases/download/v8.24.3/gitleaks_8.24.3_linux_x64.tar.gz",
    { signal: AbortSignal.timeout(60000) },
  );
  assert.equal(response.status, 200);
  const archive = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash("sha256").update(archive).digest("hex"), checksum);
  writeFileSync(`${directory}/gitleaks.tar.gz`, archive);
  const unpack = spawnSync("tar", [
    "-xzf",
    `${directory}/gitleaks.tar.gz`,
    "-C",
    directory,
    "gitleaks",
  ]);
  assert.equal(unpack.status, 0);
  chmodSync(`${directory}/gitleaks`, 0o755);
  console.info("Gitleaks 8.24.3 installed after SHA256 verification.");
} catch {
  console.error(
    "Gitleaks installation/verification failed; unverified artifacts must not be used.",
  );
  process.exitCode = 1;
}
