import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { test } from "node:test";
import {
  loadLocalEnvironment,
  localDemoDatabase,
} from "../local-demo-environment.mjs";
import { createSeedState, seedCheckpoint } from "./checkpoint.mjs";

test("checkpoint is atomic, excludes credentials and validates run IDs", async () => {
  await mkdir(".vitest", { recursive: true });
  const directory = await mkdtemp(resolve(".vitest/seed-checkpoint-"));
  try {
    const checkpoint = seedCheckpoint(directory);
    await loadLocalEnvironment(directory);
    const state = createSeedState({ count: 200 });
    await checkpoint.save(state);
    assert.deepEqual(await checkpoint.load(state.runId), state);
    assert.deepEqual(await readdir(directory), [`${state.runId}.json`]);
    await assert.rejects(checkpoint.load("../secret"));
  } finally {
    assert.ok(directory.startsWith(resolve(".vitest") + sep));
    await rm(directory, { recursive: true, force: true });
  }
});
test("CLI DB preflight requires explicit demo loopback and refuses test/remote databases", () => {
  assert.throws(() =>
    localDemoDatabase({
      DATABASE_URL: "postgres://x:y@localhost/guardian_bay",
    }),
  );
  for (const value of [
    "postgres://x:y@evil.test/guardian_bay",
    "postgres://x:y@localhost/guardian_bay_test",
  ])
    assert.throws(() =>
      localDemoDatabase({ GUARDIAN_LOCAL_DEMO: "1", DATABASE_URL: value }),
    );
  assert.match(
    localDemoDatabase({
      GUARDIAN_LOCAL_DEMO: "1",
      DATABASE_URL: "postgres://x:y@127.0.0.1/guardian_bay",
    }),
    /guardian_bay$/,
  );
});
test("CLI rejects invalid count before DB/network and npm forwards the position", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/seeder-products.mjs", "1001"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "not a database",
        PRIVATE_FIXTURE_KEY: "DO_NOT_PRINT",
      },
    },
  );
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes("DO_NOT_PRINT"));
  const dry = spawnSync(
    process.execPath,
    ["scripts/seeder-products.mjs", "250", "--dry-run"],
    { encoding: "utf8" },
  );
  assert.equal(dry.status, 0);
  assert.equal(JSON.parse(dry.stdout).count, 250);
});
