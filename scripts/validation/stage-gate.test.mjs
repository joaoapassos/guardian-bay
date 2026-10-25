import assert from "node:assert/strict";
import test from "node:test";
import { stageEligibility } from "./stage-gate.mjs";

const scope = {
  runId: "owned",
  profileId: "representative-v1",
  buildId: "build",
};
const record = {
  ...scope,
  vus: 250,
  seconds: 600,
  sloPassed: true,
  integrityPassed: true,
  generatorValid: true,
  manualReviewApproved: true,
};
test("missing, short, failed or stale-profile measurements block escalation", () => {
  assert.equal(stageEligibility(500, [], scope).eligible, false);
  for (const patch of [
    { seconds: 20 },
    { seconds: undefined },
    { seconds: NaN },
    { sloPassed: false },
    { integrityPassed: false },
    { generatorValid: false },
    { manualReviewApproved: false },
    { profileId: "other" },
    { buildId: "old" },
  ])
    assert.equal(
      stageEligibility(500, [{ ...record, ...patch }], scope).eligible,
      false,
    );
  assert.equal(stageEligibility(500, [record], scope).eligible, true);
  assert.equal(stageEligibility(1000, [record], scope).eligible, false);
  for (const target of [2000, 3500, 5000])
    assert.throws(() => stageEligibility(target, [], scope));
});
