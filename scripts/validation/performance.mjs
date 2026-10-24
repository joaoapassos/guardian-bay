import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { arch, cpus, freemem, platform, release, totalmem } from "node:os";
import { join } from "node:path";
import { writeEvidence } from "./evidence.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";
import { boundedMonitor, stopChild, supervise } from "./supervision.mjs";

labLease();
const vus = Number(process.argv[2] ?? 2);
const seconds = Number(process.argv[3] ?? 10);
const workload = process.argv[4] ?? "read";
const phase = process.env.LAB_EVIDENCE_PHASE ?? "capacity";
const diagnostic = process.env.LAB_DIAGNOSTIC === "1";
const diagnosticTask = process.env.LAB_DIAGNOSTIC_TASK ?? "02";
assert.ok(["02", "03"].includes(diagnosticTask));
const variant = {
  route: process.env.LAB_DIAGNOSTIC_ROUTE ?? "mixed",
  transport: process.env.LAB_DIAGNOSTIC_TRANSPORT ?? "proxy",
  ramp: process.env.LAB_DIAGNOSTIC_RAMP ?? "burst",
};
if (diagnostic) {
  assert.equal(workload, "read");
  assert.ok(vus <= 500);
  assert.ok(["mixed", "catalog", "account"].includes(variant.route));
  assert.ok(["proxy", "backend"].includes(variant.transport));
  assert.ok(["burst", "ramp"].includes(variant.ramp));
}
assert.ok(["capacity", "stress"].includes(phase));
assert.ok([1, 2, 10, 50, 100, 250, 500, 1000].includes(vus));
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
const appPids = pids.apps ?? [pids.app];
assert.ok(
  Array.isArray(appPids) &&
    appPids.length >= 1 &&
    appPids.length <= 2 &&
    appPids.every((pid) => Number.isSafeInteger(pid) && pid > 0),
);
const directory = join(labDirectory, `perf-${workload}-${vus}-${Date.now()}`);
const diagnosticId = diagnostic
  ? `task-${diagnosticTask}-diag-${appPids.length}instances-${variant.transport}-${variant.route}-${variant.ramp}-${vus}-${Date.now()}`
  : null;
mkdirSync(directory);
writeFileSync(
  join(directory, "manifest.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      node: process.version,
      platform: platform(),
      release: release(),
      arch: arch(),
      logicalCpus: cpus().length,
      totalMemoryBytes: totalmem(),
      vus,
      seconds,
      workload,
      diagnostic: diagnostic ? variant : null,
      evidenceId: diagnosticId,
      appInstances: appPids.length,
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      trackedDirty:
        execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
          encoding: "utf8",
        }).trim().length > 0,
      hashes: Object.fromEntries(
        [
          "package-lock.json",
          "next.config.ts",
          "scripts/validation/load.k6.js",
        ].map((path) => [
          path,
          createHash("sha256").update(readFileSync(path)).digest("hex"),
        ]),
      ),
    },
    null,
    2,
  ),
);
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
  // CPU counters need a real interval; an immediate zero delta is not 100% usage.
  await new Promise((resolve) => setTimeout(resolve, 250));
  while (!finished) {
    const now = counters();
    for (const pid of [...appPids, pids.supervisor]) {
      assert.ok(Number.isSafeInteger(pid) && pid > 0);
      const observerDirectory = join(labDirectory, "observability");
      const files = existsSync(observerDirectory)
        ? readdirSync(observerDirectory).filter(
            (name) => name.includes(`-${pid}-`) && name.endsWith(".jsonl"),
          )
        : [];
      const latest = Math.max(
        0,
        ...files.map((name) => statSync(join(observerDirectory, name)).mtimeMs),
      );
      assert.ok(
        Date.now() - latest < 5000,
        "Runtime observer missing or stale; restart instrumented lab",
      );
    }
    const cpuInterval = now.all - previous.all;
    const idleInterval = now.idle - previous.idle;
    assert.ok(
      cpuInterval > 0 && idleInterval >= 0 && idleInterval <= cpuInterval,
    );
    const cpuPercent = 100 * (1 - idleInterval / cpuInterval);
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
        `$ap=@(Get-Process -Id ${appPids.join(",")} -ErrorAction SilentlyContinue); @{app=@{CPU=($ap | Measure-Object CPU -Sum).Sum;WorkingSet64=($ap | Measure-Object WorkingSet64 -Sum).Sum;Count=$ap.Count};generator=(Get-Process -Id ${child.pid} -ErrorAction SilentlyContinue | Select-Object CPU,WorkingSet64)} | ConvertTo-Json -Compress`,
      ],
      { encoding: "utf8", windowsHide: true, timeout: 5000 },
    );
    let app = null;
    let generator = null;
    try {
      const processes = JSON.parse(resource.stdout);
      app = processes.app;
      if (app?.Count !== appPids.length) app = null;
      generator = processes.generator;
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
      cpuCounterInterval: cpuInterval,
      memoryPercent,
      connections: db.connections,
      lockWaiters: db.lock_waiters,
      appWorkingSetBytes: app?.WorkingSet64 ?? 0,
      appCpuCores,
      generatorWorkingSetBytes: generator?.WorkingSet64 ?? 0,
      generatorCpuSeconds: generator?.CPU ?? 0,
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
  diagnostic
    ? diagnosticId
    : `task-${phase === "stress" ? "13" : vus <= 2 ? "11" : "12"}-perf-${workload}-${vus}`,
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
