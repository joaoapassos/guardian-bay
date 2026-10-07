import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Checksums verified against each publisher's versioned release manifest.
const releases = [
  {
    owner: "gitleaks/gitleaks",
    version: "8.24.3",
    archive: "gitleaks_8.24.3_linux_x64.tar.gz",
    binary: "gitleaks",
    checksum:
      "9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c",
  },
  {
    owner: "rhysd/actionlint",
    version: "1.7.7",
    archive: "actionlint_1.7.7_linux_amd64.tar.gz",
    binary: "actionlint",
    checksum:
      "023070a287cd8cccd71515fedc843f1985bf96c436b7effaecce67290e7e0757",
  },
];
try {
  assert.equal(process.platform, "linux", "Installer supports Linux x64 CI");
  assert.equal(process.arch, "x64");
  const directory = resolve(".vitest/tools");
  mkdirSync(directory, { recursive: true });
  for (const release of releases) {
    const response = await fetch(
      `https://github.com/${release.owner}/releases/download/v${release.version}/${release.archive}`,
      { signal: AbortSignal.timeout(60000) },
    );
    assert.equal(response.status, 200);
    const archive = Buffer.from(await response.arrayBuffer());
    assert.equal(
      createHash("sha256").update(archive).digest("hex"),
      release.checksum,
    );
    const path = `${directory}/${release.archive}`;
    writeFileSync(path, archive);
    const unpack = spawnSync("tar", [
      "-xzf",
      path,
      "-C",
      directory,
      release.binary,
    ]);
    assert.equal(unpack.status, 0);
    chmodSync(`${directory}/${release.binary}`, 0o755);
    console.info(
      `${release.binary} ${release.version} installed after SHA256 verification.`,
    );
  }
} catch {
  console.error(
    "Security tool installation/verification failed; unverified artifacts must not be used.",
  );
  process.exitCode = 1;
}
