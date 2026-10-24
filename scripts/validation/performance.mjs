import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cpus, freemem, totalmem } from "node:os";
import { join } from "node:path";
import { writeEvidence } from "./evidence.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";
import { boundedMonitor, stopChild, supervise } from "./supervision.mjs";

labLease();
const vus = Number(process.argv[2] ?? 2);
const seconds = Number(process.argv[3] ?? 10);
const workload = process.argv[4] ?? "read";
assert.ok([1, 2, 10, 50, 100, 500, 1000].includes(vus));
assert.ok(Number.isInteger(seconds) && seconds >= 5 && seconds <= 600);
assert.ok(["read", "commerce"].includes(workload));
// Fail closed while the production dependency gate has an unresolved finding.
const sca = JSON.parse(
  readFileSync(".vitest/dependencies-production.json", "utf8"),
);
if (vus > 2)
  assert.equal(
    sca.findings.length,
    0,
    "Capacity escalation blocked by production SCA finding",
  );
const binary = join(labDirectory, "tools/k6/k6-v2.3.0-windows-amd64/k6.exe");
assert.ok(existsSync(binary), "Verified k6 2.3.0 required");
const pids = JSON.parse(
  readFileSync(join(labDirectory, "processes.json"), "utf8"),
);
assert.ok(Number.isSafeInteger(pids.app) && pids.app > 0);
const directory = join(labDirectory, `perf-${workload}-${vus}-${Date.now()}`);
mkdirSync(directory);
const sql = await openLabDb();
const samples = [];
const counters = () =>
  cpus().reduce(
    (total, cpu) => {
      total.idle += cpu.times.idle;
      total.all += Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return total;
    },
    { idle: 0, all: 0 },
  );
let previous = counters();
let finished = false;
let abort = null;
let highCpuSince = null;
let lastAppCpu;
let lastSampleTime;
const child = spawn(
  binary,
  [
    "run",
    "--quiet",
    "--summary-export",
    join(directory, "summary.json"),
    "scripts/validation/load.k6.js",
  ],
  {
    env: {
      ...process.env,
      LAB_VUS: String(vus),
      LAB_SECONDS: String(seconds),
      WORKLOAD: workload,
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
supervise(child);
child.stdout.on("data", (chunk) => {
  output = (output + chunk).slice(-16384);
});
child.stderr.on("data", (chunk) => {
  output = (output + chunk).slice(-16384);
});
const deadline = setTimeout(
  () => {
    abort = "runner-deadline";
    stopChild(child);
  },
  (seconds + 45) * 1000,
);
const monitor = (async () => {
  while (!finished) {
    const now = counters();
    const cpuPercent =
      100 *
      (1 - (now.idle - previous.idle) / Math.max(1, now.all - previous.all));
    previous = now;
    const memoryPercent = 100 * (1 - freemem() / totalmem());
    const [db] =
      (await boundedMonitor(
        () =>
          sql`SELECT count(*)::int AS connections,count(*) FILTER(WHERE wait_event_type='Lock')::int AS lock_waiters,current_setting('max_connections')::int AS max_connections FROM pg_stat_activity`,
        () => {
          abort = "monitor-failed";
          stopChild(child);
        },
      )) ?? [];
    if (!db) break;
    const resource = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Get-Process -Id ${pids.app} | Select-Object CPU,WorkingSet64 | ConvertTo-Json -Compress`,
      ],
      { encoding: "utf8", windowsHide: true, timeout: 5000 },
    );
    let app = null;
    try {
      app = JSON.parse(resource.stdout);
    } catch {
      /* Missing process stops campaign. */
    }
    const sampledAt = Date.now();
    const appCpuCores =
      app && lastAppCpu !== undefined
        ? (app.CPU - lastAppCpu) / ((sampledAt - lastSampleTime) / 1000)
        : 0;
    if (app) {
      lastAppCpu = app.CPU;
      lastSampleTime = sampledAt;
    }
    samples.push({
      at: new Date().toISOString(),
      cpuPercent,
      memoryPercent,
      connections: db.connections,
      lockWaiters: db.lock_waiters,
      appWorkingSetBytes: app?.WorkingSet64 ?? 0,
      appCpuCores,
    });
    if (cpuPercent > 90) highCpuSince ??= Date.now();
    else highCpuSince = null;
    if (
      !app ||
      memoryPercent > 85 ||
      db.connections >= db.max_connections * 0.8 ||
      (highCpuSince && Date.now() - highCpuSince >= 60000)
    ) {
      abort = !app ? "app-process-unavailable" : "resource-guard";
      stopChild(child);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
})().catch(() => {
  abort = "monitor-failed";
  stopChild(child);
});
let code;
try {
  code = await new Promise((resolve, reject) => {
    child.on("exit", resolve);
    child.on("error", reject);
  });
} finally {
  finished = true;
  clearTimeout(deadline);
  await monitor;
}
try {
  await boundedMonitor(
    () => assertIntegrity(sql),
    () => {
      abort = "integrity-unavailable";
    },
  );
} finally {
  await sql.end({ timeout: 5 });
}
writeFileSync(
  join(directory, "resources.json"),
  JSON.stringify(samples, null, 2),
);
writeFileSync(join(directory, "output.txt"), output);
const path = join(directory, "summary.json");
const summary = existsSync(path)
  ? JSON.parse(readFileSync(path, "utf8"))
  : null;
const duration = summary?.metrics?.http_req_duration;
const metrics = {
  vus,
  seconds,
  requests: summary?.metrics?.http_reqs?.count ?? 0,
  rps: summary?.metrics?.http_reqs?.rate ?? 0,
  p50: duration?.med ?? 0,
  p95: duration?.["p(95)"] ?? 0,
  p99: duration?.["p(99)"] ?? 0,
  unexpectedFailureRate: summary?.metrics?.unexpected_failures?.value ?? 1,
  maxCpuPercent: Math.max(0, ...samples.map((s) => s.cpuPercent)),
  maxMemoryPercent: Math.max(0, ...samples.map((s) => s.memoryPercent)),
  maxConnections: Math.max(0, ...samples.map((s) => s.connections)),
  maxLockWaiters: Math.max(0, ...samples.map((s) => s.lockWaiters)),
};
const passed = code === 0 && !abort && !!summary && samples.length >= 2;
writeEvidence(
  `task-${vus <= 2 ? "11" : "12"}-perf-${workload}-${vus}`,
  [
    {
      id: "PERFORMANCE",
      expected: "Thresholds, resource guard and data integrity all hold",
      observed: `exit=${code}; abort=${abort ?? "none"}; samples=${samples.length}; summary=${!!summary}`,
      status: passed ? "PASS" : "FAIL",
    },
  ],
  metrics,
);
if (!passed) process.exitCode = 1;
