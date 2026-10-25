import { channel } from "node:diagnostics_channel";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { createInflightCounter } from "./inflight-counter.mjs";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const directory = join(labDirectory, "observability");
await mkdir(directory, { recursive: true });
const file = join(
  directory,
  `${lease.runId}-${process.pid}-${Date.now()}.jsonl`,
);
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
let previous = performance.eventLoopUtilization();
let busy = false;
let dropped = 0;
let bytes = 0;
const counters = Object.create(null);
const inflight = createInflightCounter();
export function observeHttp2Response(response) {
  const finish = inflight.start();
  response.once("finish", finish);
  response.once("close", finish);
}
channel("http.server.request.start").subscribe(({ response }) => {
  const finish = inflight.start();
  response.once("finish", finish);
  response.once("close", finish);
});
export function countDiagnostic(name) {
  if (!/^[a-z][a-z0-9_.]{1,60}$/.test(name))
    throw new Error("Invalid diagnostic counter");
  counters[name] = (counters[name] ?? 0) + 1;
}
const timer = setInterval(async () => {
  if (busy || bytes >= 50 * 1024 * 1024) {
    dropped++;
    return;
  }
  busy = true;
  const current = performance.eventLoopUtilization();
  const utilization = performance.eventLoopUtilization(
    current,
    previous,
  ).utilization;
  previous = current;
  const data = `${JSON.stringify({
    at: new Date().toISOString(),
    runId: lease.runId,
    pid: process.pid,
    role: process.env.LAB_OBSERVER_ROLE === "app" ? "app" : "proxy",
    rss: process.memoryUsage().rss,
    heapUsed: process.memoryUsage().heapUsed,
    eventLoopUtilization: utilization,
    eventLoopP99Ms: histogram.percentile(99) / 1e6,
    dropped,
    counters,
    httpRequests: inflight.sample(),
  })}\n`;
  histogram.reset();
  try {
    await appendFile(file, data, { mode: 0o600 });
    bytes += Buffer.byteLength(data);
  } catch {
    console.error("Laboratory observer unavailable");
    process.exitCode = 1;
    clearInterval(timer);
  } finally {
    busy = false;
  }
}, 1000);
timer.unref();
