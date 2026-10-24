import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, transport } from "./http.mjs";
import { labDirectory, labLease, labOrigin } from "./scope.mjs";

labLease();
const data = fixtures();
const directory = join(labDirectory, `zap-run-${Date.now()}`);
mkdirSync(directory, { recursive: true });
const jar = join(labDirectory, "tools/zap/ZAP_2.17.0/zap-2.17.0.jar");
assert.ok(existsSync(jar), "Verified ZAP 2.17.0 distribution required");
const requests = [
  "/",
  "/products?query=Lab",
  "/products",
  `/products/${data.products[0].id}`,
  "/login",
  "/account",
].map((path) => ({
  url: labOrigin + path,
  method: "GET",
  responseCode: path === "/account" ? 307 : 200,
}));
for (const user of data.users) {
  const check = await transport("/account", { token: user.token });
  assert.equal(
    check.status,
    200,
    "Authenticated positive control required before ZAP",
  );
  for (const path of [
    "/account",
    "/orders",
    "/cart",
    ...(user.name === "admin"
      ? ["/admin", "/admin/orders", "/admin/audit"]
      : []),
  ])
    requests.push({
      url: labOrigin + path,
      method: "GET",
      headers: [`Cookie: __Host-guardian-session=${user.token}`],
      responseCode: 200,
    });
}
const plan = {
  env: {
    contexts: [
      {
        name: "guardian-lab",
        urls: [labOrigin],
        includePaths: ["https://127\\.0\\.0\\.1:3449/.*"],
      },
    ],
    parameters: {
      failOnError: true,
      failOnWarning: false,
      progressToStdout: true,
    },
  },
  jobs: [
    {
      type: "passiveScan-config",
      parameters: { scanOnlyInScope: true, maxAlertsPerRule: 10 },
    },
    { type: "requestor", requests },
    {
      type: "activeScan-config",
      parameters: {
        threadPerHost: 1,
        maxRuleDurationInMins: 1,
        maxScanDurationInMins: 2,
      },
      inputVectors: {
        urlQueryStringAndDataDrivenNodes: { enabled: true },
        postData: { enabled: false },
        httpHeaders: { enabled: false },
      },
    },
    {
      type: "activeScan",
      parameters: {
        context: "guardian-lab",
        url: `${labOrigin}/products`,
        maxRuleDurationInMins: 1,
        maxScanDurationInMins: 2,
        delayInMs: 500,
        threadPerHost: 1,
        addQueryParam: true,
      },
      policyDefinition: {
        defaultStrength: "Low",
        defaultThreshold: "Off",
        rules: [
          { id: 40012, strength: "Low", threshold: "Low" },
          { id: 40018, strength: "Low", threshold: "Low" },
        ],
      },
    },
    { type: "passiveScan-wait", parameters: { maxDuration: 2 } },
    {
      type: "report",
      parameters: {
        template: "traditional-json",
        reportDir: directory,
        reportFile: "report.json",
        displayReport: false,
      },
    },
  ],
};
const planPath = join(directory, "plan.yaml");
writeFileSync(planPath, JSON.stringify(plan, null, 2), { mode: 0o600 }); // JSON is a YAML subset.
const log = createWriteStream(join(directory, "private.log"));
const child = spawn(
  "java",
  [
    "-Xmx512m",
    "-jar",
    jar,
    "-cmd",
    "-loglevel",
    "DEBUG",
    "-dir",
    join(directory, "home"),
    "-host",
    "127.0.0.1",
    "-port",
    "8099",
    "-config",
    "mode=protect",
    "-config",
    "autoupdate.checkOnStart=false",
    "-config",
    "autoupdate.downloadNewRelease=false",
    "-config",
    "scanner.delayInMs=500",
    "-autorun",
    planPath,
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
child.stdout.pipe(log);
child.stderr.pipe(log, { end: false });
let timedOut = false;
const timeout = setTimeout(
  () => {
    timedOut = true;
    child.kill();
  },
  10 * 60 * 1000,
);
const code = await new Promise((resolve, reject) => {
  child.on("exit", resolve);
  child.on("error", reject);
});
clearTimeout(timeout);
log.end();
const reportPath = join(directory, "report.json");
const executionLog = existsSync(join(directory, "home/zap.log"))
  ? readFileSync(join(directory, "home/zap.log"), "utf8")
  : "";
const activeMessages = [
  ...executionLog.matchAll(/with (\d+) message\(s\) sent/g),
].reduce((sum, match) => sum + Number(match[1]), 0);
const complete =
  !timedOut && code === 0 && existsSync(reportPath) && activeMessages > 0;
let alerts = [];
if (existsSync(reportPath)) {
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  alerts = (report.site ?? [])
    .flatMap((site) => site.alerts ?? [])
    .map((a) => ({
      id: a.pluginid,
      name: a.name,
      risk: a.riskcode,
      confidence: a.confidence,
      count: a.count,
    }));
}
writeFileSync(
  join(directory, "alerts-sanitized.json"),
  JSON.stringify(alerts, null, 2),
);
writeEvidence(
  "task-06-zap",
  [
    {
      id: "ZAP_CAMPAIGN",
      expected:
        "Scoped passive authenticated reads and two low-strength GET active rules finish",
      observed: `exit=${code}; timeout=${timedOut}; report=${existsSync(reportPath)}; alertTypes=${alerts.length}`,
      status: complete ? "PASS" : "INCONCLUSIVE",
    },
  ],
  { alertTypes: alerts.length, activeMessages },
);
if (!complete) process.exitCode = 1;
