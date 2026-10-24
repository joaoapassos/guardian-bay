import assert from "node:assert/strict";
import test from "node:test";
import {
  errorClass,
  recoveryPassed,
  selectedLevel,
} from "./diagnostic-contract.mjs";

test("recovery rejects nine fast errors followed by a successful response", () => {
  const samples = Array.from({ length: 10 }, (_, i) => ({
    status: i === 9 ? 200 : 503,
    ms: 1,
  }));
  assert.equal(recoveryPassed(samples, 100), false);
  assert.equal(
    recoveryPassed(
      Array.from({ length: 10 }, () => ({ status: 200, ms: 100 })),
      100,
    ),
    true,
  );
  assert.equal(recoveryPassed([{ status: 200, ms: 1 }], 100), false);
  assert.equal(
    recoveryPassed(
      Array.from({ length: 10 }, () => ({ status: 200, ms: 121 })),
      100,
    ),
    false,
  );
});
test("levels cannot advance implicitly or accept an unapproved bound", () => {
  for (const value of [undefined, "", "5000", "100;500", "100x"])
    assert.throws(() => selectedLevel(value));
  assert.equal(selectedLevel("250"), 250);
});
test("diagnostic errors never retain secrets or arbitrary messages", () => {
  assert.equal(
    errorClass("password=secret; ECONNREFUSED /private"),
    "ECONNREFUSED",
  );
  assert.equal(errorClass("secret arbitrary SQL error"), "UNCLASSIFIED");
});
