import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const directory = join(labDirectory, "observability");
const file = readdirSync(directory)
  .filter((n) => n.startsWith(lease.runId) && n.endsWith(".cpuprofile"))
  .sort(
    (a, b) =>
      statSync(join(directory, b)).mtimeMs -
      statSync(join(directory, a)).mtimeMs,
  )[0];
assert.ok(file, "Owned CPU profile required");
const profile = JSON.parse(readFileSync(join(directory, file), "utf8"));
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const parents = new Map();
for (const node of profile.nodes)
  for (const child of node.children ?? []) parents.set(child, node.id);
const counts = {
  idle: 0,
  garbageCollection: 0,
  nextRenderRuntimeInclusive: 0,
  moneyFormatterInclusive: 0,
};
for (const id of profile.samples) {
  const stack = [];
  let cursor = id;
  while (cursor) {
    stack.push(nodes.get(cursor).callFrame);
    cursor = parents.get(cursor);
  }
  if (stack.some((c) => c.functionName === "(idle)")) counts.idle++;
  if (stack.some((c) => c.functionName === "(garbage collector)"))
    counts.garbageCollection++;
  if (stack.some((c) => c.url.includes("app-page-turbo.runtime")))
    counts.nextRenderRuntimeInclusive++;
  if (stack.some((c) => c.url.includes("src_lib_money_price")))
    counts.moneyFormatterInclusive++;
}
writeFileSync(
  "docs/validation/epic13-cpu-profile.json",
  `${JSON.stringify({ runId: lease.runId, durationSeconds: (profile.endTime - profile.startTime) / 1e6, samples: profile.samples.length, counts, samplePercent: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, (100 * v) / profile.samples.length])), decision: "NO_PRODUCT_CHANGE_WITHOUT_LOCALIZED_BOTTLENECK", limitations: ["Inclusive categories overlap; sample percentages are not exact CPU-time percentages", "Includes startup and idle periods outside the load window", "Bundled code prevents attributing absent module names to zero SQL cost", "Profiler overhead makes this run unsuitable as a clean baseline", "Raw profile with local paths remains private"] }, null, 2)}\n`,
);
console.info(JSON.stringify({ samples: profile.samples.length, counts }));
