import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { test } from "node:test";
import { installationSecrets, operatorEnvironment } from "./environment.mjs";
import { parseInitOptions } from "./preflight.mjs";
import {
  assertSameInstallation,
  createInstallation,
  loadInstallation,
  saveInstallation,
} from "./state.mjs";

test("rerun preserves secrets, CPF key and public state; corrupted secrets never regenerate", async () => {
  await mkdir(".vitest", { recursive: true });
  const directory = await mkdtemp(resolve(".vitest/init-state-"));
  try {
    const options = parseInitOptions([]);
    const state = createInstallation(options);
    await saveInstallation(state, directory);
    const first = await installationSecrets(directory);
    assert.deepEqual(await installationSecrets(directory), first);
    assert.deepEqual(await loadInstallation(directory), state);
    assertSameInstallation(state, options);
    assert.throws(() =>
      assertSameInstallation(state, { ...options, dbPort: 5434 }),
    );
    const text = await readFile(`${directory}/state.json`, "utf8");
    assert.ok(
      !text.includes(first.cpfKey) && !text.includes(first.appPassword),
    );
    await writeFile(
      `${directory}/secrets.json`,
      '{"appPassword":"PRIVATE_DO_NOT_PRINT",bad}',
    );
    await assert.rejects(
      installationSecrets(directory),
      (error) => !error.message.includes("PRIVATE_DO_NOT_PRINT"),
    );
  } finally {
    assert.ok(directory.startsWith(resolve(".vitest") + sep));
    await rm(directory, { recursive: true, force: true });
  }
});
test("dry run lists work without requiring node_modules or invoking installers/tests", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/system-init.mjs", "--dry-run"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Sem DNS\/hosts, testes ou seed/);
  assert.ok(!result.stdout.includes("DATABASE_URL="));
  if (process.platform !== "linux") {
    const unsupported = spawnSync(
      process.execPath,
      ["scripts/system-init.mjs"],
      { encoding: "utf8" },
    );
    assert.equal(unsupported.status, 1);
    assert.match(unsupported.stderr, /Ubuntu Server24.04/);
    assert.ok(!unsupported.stdout.includes("[Pacotes]"));
  }
});

test("operator checkpoint remains in owned checkout without exposing private runtime directories", () => {
  const result = operatorEnvironment(
    { sourceDir: resolve(".vitest/operator") },
    {
      NODE_ENV: "production",
      SEED_STATE_DIR: "/var/lib/guardian-bay/seeds",
      PRODUCT_MEDIA_DIR: "/var/lib/guardian-bay/media",
    },
  );
  assert.equal(result.SEED_STATE_DIR, resolve(".vitest/operator/var/seeds"));
  assert.equal(result.NODE_ENV, undefined);
  assert.equal(result.PRODUCT_MEDIA_DIR, "/var/lib/guardian-bay/media");
});
