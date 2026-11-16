import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSimulationState } from "./simulation-state.mjs";

test("persiste somente intenções válidas e rejeita estado corrompido", async () => {
  const directory = await mkdtemp(join(tmpdir(), "guardian-simulation-"));
  try {
    const state = createSimulationState(directory);
    assert.deepEqual(await state.load(), {});
    const value = {
      user: { id: "00000000-0000-4000-8000-000000000001", remaining: 3 },
    };
    await state.save(value);
    assert.deepEqual(await state.load(), value);
    assert.ok(
      !(await readFile(join(directory, "pending.json"), "utf8")).includes(
        "password",
      ),
    );
    await writeFile(
      join(directory, "pending.json"),
      '{"user":{"id":"fake","remaining":1}}',
    );
    await assert.rejects(state.load());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
