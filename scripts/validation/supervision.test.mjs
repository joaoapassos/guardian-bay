import assert from "node:assert/strict";
import test from "node:test";
import { boundedMonitor } from "./supervision.mjs";

test("monitor failure immediately stops the generator", async () => {
  let stopped = 0;
  const result = await boundedMonitor(
    () => {
      throw new Error("offline");
    },
    () => stopped++,
  );
  assert.equal(result, null);
  assert.equal(stopped, 1);
});

test("hung monitor is bounded and stops the generator", async () => {
  let stopped = 0;
  const result = await boundedMonitor(
    () => new Promise(() => {}),
    () => stopped++,
    20,
  );
  assert.equal(result, null);
  assert.equal(stopped, 1);
});
