import assert from "node:assert/strict";
import test from "node:test";
import { createInflightCounter } from "./inflight-counter.mjs";

test("finish followed by close counts once and preserves actual overlap", () => {
  const counter = createInflightCounter();
  const first = counter.start();
  const second = counter.start();
  first();
  first();
  assert.deepEqual(counter.snapshot(), {
    current: 1,
    peak: 2,
    started: 2,
    completed: 1,
  });
  second();
  assert.deepEqual(counter.snapshot(), {
    current: 0,
    peak: 2,
    started: 2,
    completed: 2,
  });
});
