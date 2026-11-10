import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { activate } from "../system-update.mjs";
import {
  checkMigrationHistory,
  readUpdateMigrations,
  runUpdateSteps,
} from "./update.mjs";

test("migration history is an exact prefix and unreviewed pending SQL is refused", () => {
  const migrations = [
    { when: 10, hash: "a", reviewed: true },
    { when: 20, hash: "b", reviewed: true },
  ];
  assert.equal(checkMigrationHistory(migrations, [{ when: 10, hash: "a" }]), 1);
  assert.equal(checkMigrationHistory(migrations, migrations), 0);
  assert.throws(() =>
    checkMigrationHistory(migrations, [{ when: 10, hash: "x" }]),
  );
  assert.throws(() =>
    checkMigrationHistory([{ when: 10, hash: "a", reviewed: false }], []),
  );
});

test("current reviewed migration is recognized by its exact contents", async () => {
  const migrations = await readUpdateMigrations(process.cwd());
  assert.equal(migrations.at(-1).reviewed, true);
  assert.equal(checkMigrationHistory(migrations, migrations.slice(0, -1)), 1);
  assert.ok(
    (await readFile("drizzle/0023_gigantic_gwen_stacy.sql", "utf8")).includes(
      "suspended",
    ),
  );
});

test("activation failure restores previous release and never saves the new state", async () => {
  const targets = [],
    commands = [];
  const state = { activeRelease: "old" };
  await assert.rejects(
    activate(
      { installDir: "/opt/test", appPort: 3000 },
      state,
      { directory: "new" },
      "old",
      {
        pointCurrent: async (_base, target) => targets.push(target),
        run: async (_cmd, args) => {
          commands.push(args[0]);
          return { code: 0 };
        },
        httpProbe: async () => false,
        delay: async () => {},
        saveInstallation: async () => {
          throw new Error("unexpected save");
        },
      },
    ),
    /resposta HTTP/,
  );
  assert.deepEqual(targets, ["new", "old"]);
  assert.equal(commands.filter((command) => command === "restart").length, 2);
  assert.equal(state.activeRelease, "old");
});

test("healthy activation saves the new release without changing existing configuration", async () => {
  const config = { host: "localhost", appPort: 3456, dbPort: 5433 };
  const state = { activeRelease: "old", config };
  const targets = [];
  let saved;
  await activate(
    { installDir: "/opt/test", appPort: 3456 },
    state,
    { directory: "new" },
    "old",
    {
      pointCurrent: async (_base, target) => targets.push(target),
      run: async () => ({ code: 0 }),
      httpProbe: async (port) => port === 3456,
      saveInstallation: async (value) => {
        saved = structuredClone(value);
      },
    },
  );
  assert.deepEqual(targets, ["new"]);
  assert.deepEqual(saved, { activeRelease: "new", config });
});

test("update orders preparation, migration, grants, build and activation", async () => {
  const seen = [];
  const steps = Object.fromEntries(
    ["prepare", "migrate", "grants", "build", "activate"].map((name) => [
      name,
      async () => seen.push(name),
    ]),
  );
  await runUpdateSteps(steps);
  assert.deepEqual(seen, ["prepare", "migrate", "grants", "build", "activate"]);
  seen.length = 0;
  steps.migrate = async () => {
    throw new Error("migration failed");
  };
  await assert.rejects(runUpdateSteps(steps), /banco/);
  assert.deepEqual(seen, ["prepare"]);
});
