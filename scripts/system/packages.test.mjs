import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  postgresAptSource,
  postgresKeyFingerprint,
  restorePackagePolicy,
} from "./packages.mjs";

test("PGDG source matches the actual Ubuntu version with scoped signatures", () => {
  for (const [version, suite] of [
    ["24.04", "noble"],
    ["26.04", "resolute"],
  ]) {
    const source = postgresAptSource(`ID=ubuntu\nVERSION_ID="${version}"\n`);
    assert.match(source, new RegExp(`\nSuites: ${suite}-pgdg\n`));
    assert.match(
      source,
      /URIs: https:\/\/apt.postgresql.org\/pub\/repos\/apt\n/,
    );
    assert.match(source, /Architectures: amd64\n/);
    assert.match(
      source,
      /Signed-By: \/usr\/share\/keyrings\/guardian-bay-pgdg.asc\n/,
    );
    assert.ok(!source.includes("trusted=yes"));
    assert.equal(
      postgresAptSource(`ID='ubuntu'\r\nVERSION_ID='${version}'\r\n`),
      source,
    );
  }
  for (const release of [
    "",
    "ID=ubuntu\nVERSION_ID=26.10",
    "ID=debian\nVERSION_ID=26.04",
  ]) {
    assert.throws(() => postgresAptSource(release), /Ubuntu/);
  }
});

test("malformed PGDG key is rejected", () => {
  assert.throws(() => postgresKeyFingerprint("invalid key"), /PGDG/);
});

test("package policy recovery preserves journal on failure and is repeatable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "guardian-package-policy-"));
  const policyPath = join(directory, "createcluster.conf");
  const journalPath = join(directory, "package-policy.json");
  try {
    await writeFile(policyPath, "original policy\n", { mode: 0o640 });
    const metadata = await stat(policyPath);
    const backup = {
      existed: true,
      content: "original policy\n",
      mode: metadata.mode & 0o777,
      uid: metadata.uid,
      gid: metadata.gid,
      maskedCaddy: true,
    };
    await writeFile(journalPath, JSON.stringify(backup));
    await writeFile(policyPath, "temporary policy\n");
    const commands = [];
    const options = {
      policyPath,
      journalPath,
      runCommand: async (command, args) => {
        commands.push([command, ...args]);
        throw new Error("interrupted unmask");
      },
    };
    await assert.rejects(restorePackagePolicy(options), /interrupted unmask/);
    assert.equal(await readFile(policyPath, "utf8"), backup.content);
    if (process.platform !== "win32") {
      const restored = await stat(policyPath);
      assert.equal(restored.mode & 0o777, backup.mode);
      assert.equal(restored.uid, backup.uid);
      assert.equal(restored.gid, backup.gid);
    }
    assert.deepEqual(JSON.parse(await readFile(journalPath, "utf8")), backup);
    options.runCommand = async (command, args) => {
      commands.push([command, ...args]);
    };
    await restorePackagePolicy(options);
    assert.deepEqual(commands, [
      ["systemctl", "unmask", "--runtime", "caddy.service"],
      ["systemctl", "unmask", "--runtime", "caddy.service"],
      ["systemctl", "disable", "caddy"],
    ]);
    await assert.rejects(readFile(journalPath), { code: "ENOENT" });
    await restorePackagePolicy(options);
    assert.equal(commands.length, 3);
    // A policy absent before installation must not be left behind on recovery.
    await writeFile(
      journalPath,
      JSON.stringify({ existed: false, maskedCaddy: false }),
    );
    await restorePackagePolicy(options);
    await assert.rejects(readFile(policyPath), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
