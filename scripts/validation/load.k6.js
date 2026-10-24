import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import { Rate } from "k6/metrics";

if (
  __ENV.LAB_BASE_URL !== "https://127.0.0.1:3449" ||
  __ENV.TEST_DATABASE_URL !==
    "postgresql://postgres@127.0.0.1:55442/guardian_bay_test"
)
  throw new Error("Unauthorized target");
const origin = __ENV.LAB_BASE_URL;
const workload = __ENV.WORKLOAD ?? "read";
if (!["read", "commerce"].includes(workload))
  throw new Error("Unknown workload");
const users = new SharedArray(
  "owned users",
  () => JSON.parse(open("../../.vitest/epic12/load-fixtures.json")).users,
);
const productId = JSON.parse(
  open("../../.vitest/epic12/load-fixtures.json"),
).productId;
const fixtureRunId = JSON.parse(
  open("../../.vitest/epic12/load-fixtures.json"),
).runId;
const captures = JSON.parse(open("../../.vitest/epic12/captures.json"));
const lease = JSON.parse(open("../../.vitest/epic12/lease.json"));
const age = Date.now() - Date.parse(lease.createdAt);
if (!(age >= 0 && age < 86400000) || fixtureRunId !== lease.runId)
  throw new Error("Invalid lease");
const vus = Number(__ENV.LAB_VUS ?? "2");
const seconds = Number(__ENV.LAB_SECONDS ?? "10");
if (
  vus > 2 &&
  JSON.parse(open("../../.vitest/dependencies-production.json")).findings
    .length !== 0
)
  throw new Error("Production SCA blocks escalation");
if (
  !Number.isInteger(vus) ||
  vus < 1 ||
  vus > 1000 ||
  !Number.isInteger(seconds) ||
  seconds < 5 ||
  seconds > 600
)
  throw new Error("Bound exceeded");
const failures = new Rate("unexpected_failures");
export const options = {
  vus,
  duration: `${seconds}s`,
  maxRedirects: 0,
  insecureSkipTLSVerify: true,
  summaryTrendStats: ["avg", "min", "med", "p(95)", "p(99)", "max"],
  thresholds: {
    unexpected_failures: [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "5s" },
    ],
    http_req_duration: [
      workload === "read" ? "p(95)<500" : "p(95)<1500",
      workload === "read" ? "p(99)<1500" : "p(99)<3000",
    ],
    checks: ["rate==1"],
  },
};
function action(name, input, user) {
  const response = http.post(
    origin + captures[name].path,
    JSON.stringify([input]),
    {
      headers: {
        "next-action": captures[name].actionId,
        "content-type": "text/plain;charset=UTF-8",
        accept: "text/x-component",
        origin,
        cookie: `__Host-guardian-session=${user.token}`,
      },
      tags: { name: `action-${name}` },
      timeout: "10s",
    },
  );
  let result;
  for (const line of response.body.split("\n")) {
    try {
      const value = JSON.parse(line.slice(line.indexOf(":") + 1));
      if (typeof value?.success === "boolean") result = value;
    } catch {
      /* Flight record */
    }
  }
  const success = response.status === 200 && result?.success === true;
  check(response, { "Action commercial success": () => success });
  failures.add(!success);
}
export default function () {
  const user = users[__VU - 1];
  const publicResponse = http.get(`${origin}/products`, {
    tags: { name: "catalog" },
    timeout: "10s",
  });
  const privateResponse = http.get(`${origin}/account`, {
    headers: { cookie: `__Host-guardian-session=${user.token}` },
    tags: { name: "account" },
    timeout: "10s",
  });
  const publicSuccess = check(publicResponse, {
    "catalog HTTP 200": (r) => r.status === 200,
  });
  const privateSuccess = check(privateResponse, {
    "account HTTP 200": (r) => r.status === 200,
  });
  const success = publicSuccess && privateSuccess;
  failures.add(!success);
  if (workload === "commerce") {
    action("addCart", { productId, quantity: 1 }, user);
    if (__ITER % 5 === 0)
      action(
        "checkout",
        { checkoutKey: crypto.randomUUID(), payment: { method: "PIX" } },
        user,
      );
  }
  sleep(workload === "commerce" ? 3 : 1);
}
