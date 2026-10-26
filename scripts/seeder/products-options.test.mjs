import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProductOptions } from "./products-options.mjs";

test("default200, inclusive1–1000 and strict argument validation", () => {
  assert.equal(parseProductOptions([]).count, 200);
  for (const value of ["1", "1000"])
    assert.equal(parseProductOptions([value]).count, Number(value));
  for (const value of ["0", "1001", "-1", "1.5", "NaN", "abc", "1e3", ""])
    assert.throws(() => parseProductOptions([value]));
  assert.throws(() => parseProductOptions(["--unknown"]));
  assert.throws(() => parseProductOptions(["--query", "equipment"]));
});
