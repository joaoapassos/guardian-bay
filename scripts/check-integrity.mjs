import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function git(args) {
  const command = spawnSync("git", args, { encoding: "utf8" });
  assert.equal(command.status, 0, "Repository check failed");
  return command.stdout;
}
try {
  const manifest = JSON.parse(readFileSync("package.json"));
  const lock = JSON.parse(readFileSync("package-lock.json"));
  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.version, manifest.version);
  for (const kind of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ])
    assert.deepEqual(
      lock.packages[""][kind] ?? {},
      manifest[kind] ?? {},
      "Manifest/lockfile mismatch",
    );
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    assert.ok(!entry.link, "Linked dependency requires explicit review");
    assert.match(
      entry.resolved,
      /^https:\/\/registry\.npmjs\.org\/.+\.tgz$/,
      "Unexpected package source requires review",
    );
    assert.match(
      entry.integrity,
      /^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/,
      "Package integrity missing",
    );
  }
  // Working tree is compared to the index: intentional local staged work is allowed.
  // GitHub checkout is pristine; any staged modification in CI is also forbidden.
  git(["diff", "--exit-code"]);
  git(["diff", "--cached", "--check"]);
  if (process.env.CI === "true") git(["diff", "--cached", "--exit-code"]);
  assert.equal(
    git(["ls-files", "--others", "--exclude-standard", "-z"]),
    "",
    "Unexpected non-ignored output",
  );
  console.info(
    "Repository integrity: manifest/lockfile sources/checksums and indexed tree unchanged by gates.",
  );
} catch {
  console.error(
    "Repository integrity gate failed. Review manifest/lockfile, tracked or unexpected generated files; no autofix was applied.",
  );
  process.exitCode = 1;
}
