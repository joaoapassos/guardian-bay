import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function createSeedState(options) {
  return {
    version: 2,
    runId: randomUUID(),
    count: options.count,
    created: 0,
    reason: null,
  };
}
export function seedCheckpoint(
  directory = process.env.SEED_STATE_DIR ?? resolve("var/seeds"),
) {
  const filename = (id) => {
    if (!uuid.test(id)) throw new Error("INVALID_RUN_ID");
    return join(directory, `${id}.json`);
  };
  return {
    async save(state) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const path = filename(state.runId);
      await writeFile(`${path}.tmp`, `${JSON.stringify(state)}\n`, {
        mode: 0o600,
      });
      await rename(`${path}.tmp`, path);
    },
    async load(id) {
      const state = JSON.parse(await readFile(filename(id), "utf8"));
      if (
        state.version !== 2 ||
        state.runId !== id ||
        !Number.isInteger(state.count) ||
        state.count < 1 ||
        state.count > 1000
      )
        throw new Error("INVALID_CHECKPOINT");
      return state;
    },
  };
}
