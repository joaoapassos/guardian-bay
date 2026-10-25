import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationCohort,
  navigationEligible,
  navigationProfile,
} from "./navigation-contract.mjs";

test("1000 users retain explicit70/20/8/2 cohorts", () => {
  const counts = {};
  for (let i = 1; i <= 1000; i++) {
    const c = navigationCohort(i, 1000);
    counts[c] = (counts[c] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    browse: 700,
    cart: 200,
    checkout: 80,
    history: 20,
  });
});
test("navigation requires reviewed prior sustained stage with matching scope", () => {
  const scope = {
    runId: "run",
    buildId: "build",
    sourceTree: "source",
    topology: "eight-h2",
    harnessSha256: "harness",
  };
  const prior = {
    ...scope,
    profileId: navigationProfile,
    vus: 500,
    seconds: 900,
    passed: true,
    integrityPassed: true,
    reviewApproved: true,
  };
  assert.equal(navigationEligible(1000, 1200, [prior], scope), true);
  assert.equal(
    navigationEligible(1000, 1200, [prior, { ...prior, passed: false }], scope),
    false,
  );
  assert.equal(
    navigationEligible(
      1000,
      1200,
      [
        prior,
        {
          ...prior,
          passed: false,
          integrityPassed: false,
          reviewApproved: false,
          state: "RUNNING_OR_INTERRUPTED",
        },
      ],
      scope,
    ),
    false,
  );
  for (const patch of [
    { seconds: 60 },
    { passed: false },
    { reviewApproved: false },
    { buildId: "old" },
    { topology: "other" },
    { harnessSha256: "other" },
  ])
    assert.equal(
      navigationEligible(1000, 1200, [{ ...prior, ...patch }], scope),
      false,
    );
  assert.equal(navigationEligible(1000, 60, [prior], scope), false);
  assert.equal(navigationEligible(5000, 1200, [prior], scope), false);
});
