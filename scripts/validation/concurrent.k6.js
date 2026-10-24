import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

const origin = "https://127.0.0.1:3449";
if (
  __ENV.LAB_BASE_URL !== origin ||
  __ENV.TEST_DATABASE_URL !==
    "postgresql://postgres@127.0.0.1:55442/guardian_bay_test"
)
  throw new Error("Unauthorized concurrency target");
const requests = Number(__ENV.LAB_REQUESTS);
const transport = __ENV.LAB_HTTP_TRANSPORT ?? "proxy";
const appCount = Number(__ENV.LAB_APP_COUNT);
if (!["proxy", "backend"].includes(transport) || ![1, 2, 4].includes(appCount))
  throw new Error("Invalid local topology");
if (![10, 25, 50, 100, 250].includes(requests))
  throw new Error("Unapproved request concurrency level");
const lease = JSON.parse(open("../../.vitest/epic12/lease.json"));
const fixtures = JSON.parse(open("../../.vitest/epic12/load-fixtures.json"));
const age = Date.now() - Date.parse(lease.createdAt);
if (
  !Number.isFinite(age) ||
  age < 0 ||
  age >= 86400000 ||
  fixtures.runId !== lease.runId
)
  throw new Error("Invalid lease");
const failures = new Rate("unexpected_failures");
const burstWall = new Trend("burst_wall_ms", true);
export const options = {
  vus: 1,
  iterations: 1,
  batch: requests,
  batchPerHost: requests,
  maxRedirects: 0,
  insecureSkipTLSVerify: true,
  discardResponseBodies: true,
  summaryTrendStats: ["med", "p(95)", "p(99)", "max"],
  thresholds: {
    checks: ["rate==1"],
    http_reqs: [`count==${requests}`],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    unexpected_failures: ["rate<0.01"],
  },
};
export default function () {
  sleep(2);
  const batch = Array.from({ length: requests }, (_, i) => ({
    method: "GET",
    url:
      (transport === "proxy"
        ? origin
        : `http://127.0.0.1:${3139 + (i % appCount)}`) +
      (i % 2 === 0 ? "/products" : "/account"),
    params: {
      headers: {
        host: "127.0.0.1:3449",
        cookie: `__Host-guardian-session=${fixtures.users[i].token}`,
      },
      tags: { name: i % 2 === 0 ? "catalog" : "account" },
      timeout: "10s",
    },
  }));
  const start = Date.now();
  const responses = http.batch(batch);
  burstWall.add(Date.now() - start);
  for (const response of responses) {
    const ok = check(response, {
      "concurrent request HTTP 200 without redirect": (r) => r.status === 200,
    });
    failures.add(!ok);
  }
  sleep(3);
}
