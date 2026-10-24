import assert from "node:assert/strict";

export const stagePlan = [
  { vus: 100, seconds: 600 },
  { vus: 250, seconds: 600 },
  { vus: 500, seconds: 900 },
  { vus: 1000, seconds: 1200 },
  { vus: 2000, seconds: 1800 },
  { vus: 3500, seconds: 2700 },
  { vus: 5000, seconds: 3600 },
];

export function stageEligibility(target, records, scope) {
  const index = stagePlan.findIndex((stage) => stage.vus === target);
  assert.ok(index >= 0, "Unknown load stage");
  const previous = index === 0 ? { vus: 2, seconds: 15 } : stagePlan[index - 1];
  const relevant = records.filter(
    (record) =>
      record.vus === previous.vus &&
      record.runId === scope.runId &&
      record.profileId === scope.profileId &&
      record.buildId === scope.buildId,
  );
  const last = relevant.at(-1);
  const reasons = [];
  if (!last)
    reasons.push(
      "No previous-stage evidence for the same run, profile and build",
    );
  else {
    if (!Number.isSafeInteger(last.seconds) || last.seconds < previous.seconds)
      reasons.push("Previous measurement window missing or too short");
    for (const field of [
      "sloPassed",
      "integrityPassed",
      "generatorValid",
      "manualReviewApproved",
    ])
      if (last[field] !== true) reasons.push(`${field} was not approved`);
  }
  return {
    target,
    previous: previous.vus,
    eligible: reasons.length === 0,
    reasons,
  };
}
