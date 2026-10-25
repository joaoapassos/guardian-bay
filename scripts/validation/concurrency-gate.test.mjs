import assert from "node:assert/strict";
import test from "node:test";
import { assertConcurrencyProgression } from "./concurrency-gate.mjs";

test("progression rejects missing, stale, wrong topology and unobserved overlap", () => {
  const context = {
    runId: "own",
    buildId: "build",
    sourceTree: "source",
    now: 2000000,
    appInstances: 8,
    appPoolMax: 5,
    backlog: 511,
  };
  const report = {
    runId: "own",
    buildId: "build",
    sourceTree: "source",
    capturedAt: new Date(1999000).toISOString(),
    cases: [{ id: "PERFORMANCE", status: "PASS" }],
    metrics: {
      requestedConcurrency: 500,
      measuredRequests: 500,
      maxProxyInflight: 500,
      measuredHttp2Requests: 500,
      appInstances: 8,
      appPoolMax: 5,
      proxyHttp2Configured: 1,
      reuseProfileSelected: 1,
      proxyBacklog: 511,
      unexpectedFailureRate: 0,
      p95: 350,
      p99: 400,
    },
  };
  assert.doesNotThrow(() =>
    assertConcurrencyProgression(1000, [report], context),
  );
  assert.throws(() => assertConcurrencyProgression(2000, [report], context));
  assert.throws(() => assertConcurrencyProgression(1000, [], context));
  for (const patch of [
    { capturedAt: new Date(0).toISOString() },
    { buildId: "other" },
    { metrics: { ...report.metrics, maxProxyInflight: 499 } },
    { metrics: { ...report.metrics, appInstances: 4 } },
    { metrics: { ...report.metrics, p95: 501 } },
    { metrics: { ...report.metrics, unexpectedFailureRate: 0.001 } },
  ])
    assert.throws(() =>
      assertConcurrencyProgression(1000, [{ ...report, ...patch }], context),
    );
});
