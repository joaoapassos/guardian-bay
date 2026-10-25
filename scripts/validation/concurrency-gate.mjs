import assert from "node:assert/strict";

export const concurrencyLevels = [
  10, 25, 50, 100, 250, 500, 1000, 2000, 3500, 5000,
];

export function priorConcurrencyPassed(report, previous, context) {
  const m = report?.metrics;
  return (
    report?.runId === context.runId &&
    report?.buildId === context.buildId &&
    report?.sourceTree === context.sourceTree &&
    Date.parse(report?.capturedAt) <= context.now &&
    context.now - Date.parse(report?.capturedAt) < 30 * 60 * 1000 &&
    report?.cases?.some((c) => c.id === "PERFORMANCE" && c.status === "PASS") &&
    m?.requestedConcurrency === previous &&
    m.measuredRequests === previous &&
    m.maxProxyInflight >= previous &&
    m.measuredHttp2Requests === previous &&
    m.appInstances === context.appInstances &&
    m.appPoolMax === context.appPoolMax &&
    m.proxyHttp2Configured === 1 &&
    m.reuseProfileSelected === 1 &&
    m.proxyBacklog === context.backlog &&
    (m.upstreamMaxSockets ?? 0) === (context.upstreamMaxSockets ?? 0) &&
    m.unexpectedFailureRate === 0 &&
    m.p95 > 0 &&
    m.p95 < 500 &&
    m.p99 > 0 &&
    m.p99 < 1500
  );
}

export function assertConcurrencyProgression(requests, reports, context) {
  assert.ok(
    concurrencyLevels.includes(requests),
    "Unapproved HTTP concurrency",
  );
  if (requests <= 500) return;
  const previous = concurrencyLevels[concurrencyLevels.indexOf(requests) - 1];
  assert.ok(
    reports.some((r) => priorConcurrencyPassed(r, previous, context)),
    `Missing fresh matching PASS with observed ${previous} HTTP requests in flight`,
  );
}
