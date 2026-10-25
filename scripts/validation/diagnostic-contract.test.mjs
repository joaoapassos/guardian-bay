import assert from "node:assert/strict";
import test from "node:test";
import {
  errorClass,
  instancePorts,
  proxyBacklog,
  recoveryPassed,
  selectedLevel,
} from "./diagnostic-contract.mjs";

test("proxy backlog changes are bounded and default remains511", () => {
  assert.equal(proxyBacklog(), 511);
  assert.equal(proxyBacklog("2048"), 2048);
  for (const value of ["0", "-1", "999999", "511;whoami"])
    assert.throws(() => proxyBacklog(value));
});

test("instance ports are fixed loopback lab ports with a bounded process count", () => {
  assert.deepEqual(instancePorts("2"), [3139, 3140]);
  assert.deepEqual(instancePorts("4"), [3139, 3140, 3141, 3142]);
  assert.equal(instancePorts("8").length, 8);
  assert.deepEqual(
    instancePorts("16"),
    Array.from({ length: 16 }, (_, i) => 3139 + i),
  );
  for (const value of ["0", "3", "NaN", "2;whoami"])
    assert.throws(() => instancePorts(value));
});

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
