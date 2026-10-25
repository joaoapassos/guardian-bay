export const navigationProfile = "navigation-v1";
export const navigationStages = [
  { vus: 10, seconds: 120 },
  { vus: 100, seconds: 600 },
  { vus: 250, seconds: 600 },
  { vus: 500, seconds: 900 },
  { vus: 1000, seconds: 1200 },
];
export function navigationCohort(vu, total) {
  const percentile = Math.floor(((vu - 1) * 100) / total);
  return percentile < 70
    ? "browse"
    : percentile < 90
      ? "cart"
      : percentile < 98
        ? "checkout"
        : "history";
}
export function navigationEligible(vus, seconds, records, scope) {
  const index = navigationStages.findIndex(
    (s) => s.vus === vus && s.seconds === seconds,
  );
  if (index < 0) return false;
  if (index === 0) return true;
  const previous = navigationStages[index - 1];
  const last = records
    .filter(
      (r) =>
        r.vus === previous.vus &&
        r.seconds === previous.seconds &&
        r.runId === scope.runId &&
        r.buildId === scope.buildId &&
        r.sourceTree === scope.sourceTree &&
        r.harnessSha256 === scope.harnessSha256 &&
        r.profileId === navigationProfile &&
        r.topology === scope.topology,
    )
    .at(-1);
  return (
    last?.passed === true &&
    last.integrityPassed === true &&
    last.reviewApproved === true
  );
}
