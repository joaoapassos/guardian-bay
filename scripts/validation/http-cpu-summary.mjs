import assert from "node:assert/strict";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const topology = JSON.parse(
  readFileSync(join(labDirectory, "processes.json"), "utf8"),
);
const group = (url) =>
  url.includes("node:")
    ? url.includes("http2")
      ? "node-http2"
      : url.includes("http")
        ? "node-http1"
        : "node-other"
    : url.includes("app-page") || url.includes("react-server")
      ? "next-render"
      : url.includes("postgres")
        ? "postgres-client"
        : url.includes("next")
          ? "next-other"
          : url.includes(".next/") || url.includes(".next\\")
            ? "compiled-app"
            : "other";
const reports = [];
for (const pid of [topology.supervisor, ...topology.apps]) {
  const path = join(
    labDirectory,
    "observability",
    `${lease.runId}-${pid}.cpuprofile`,
  );
  assert.ok(statSync(path).mtimeMs > Date.parse(topology.startedAt));
  const profile = JSON.parse(readFileSync(path, "utf8"));
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const buckets = {};
  const functions = new Map();
  let active = 0;
  for (const id of profile.samples) {
    const frame = nodes.get(id).callFrame;
    if (frame.functionName === "(idle)") continue;
    active++;
    const category = group(frame.url);
    buckets[category] = (buckets[category] ?? 0) + 1;
    const fn =
      frame.functionName.replace(/[^a-zA-Z0-9_.<> -]/g, "_").slice(0, 80) ||
      "anonymous";
    const key = `${category}:${fn}`;
    functions.set(key, (functions.get(key) ?? 0) + 1);
  }
  reports.push({
    role: pid === topology.supervisor ? "proxy" : "app",
    durationSeconds: (profile.endTime - profile.startTime) / 1e6,
    samples: profile.samples.length,
    activeSamples: active,
    selfBuckets: buckets,
    hotspots: [...functions]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([label, samples]) => ({ label, samples })),
  });
}
writeFileSync(
  `docs/validation/epic13-http-cpu-${Date.now()}.json`,
  `${JSON.stringify({ runId: lease.runId, appInstances: topology.apps.length, profiles: reports, limitations: ["45-second CPU sample includes startup, sequential warming, idle and profiled burst; not an unprofiled performance baseline", "Self-sample categories do not measure PostgreSQL execution or pool wait", "Function names are sanitized; paths, raw profiles and stack traces remain private", "Cannot subtract CPU sample percentages from request percentiles"] }, null, 2)}\n`,
);
console.info(
  JSON.stringify(
    reports
      .filter((r) => r.role === "proxy")
      .concat(reports.filter((r) => r.role === "app").slice(0, 1)),
  ),
);
