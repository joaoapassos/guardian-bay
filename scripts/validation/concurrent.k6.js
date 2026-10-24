import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Gauge, Rate, Trend } from "k6/metrics";

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
if (
  !["proxy", "backend"].includes(transport) ||
  ![1, 2, 4, 8].includes(appCount)
)
  throw new Error("Invalid local topology");
if (![10, 25, 50, 100, 250, 500].includes(requests))
  throw new Error("Unapproved request concurrency level");
const connectionProfile = __ENV.LAB_CONNECTION_PROFILE ?? "new";
if (!["new", "reuse"].includes(connectionProfile))
  throw new Error("Invalid connection profile");
const reuse = connectionProfile === "reuse";
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
const measuredHttp = new Trend("measured_http_ms", true);
const warmHttp = new Trend("warm_http_ms", true);
const measuredTls = new Trend("measured_tls_ms", true);
const measuredCount = new Counter("measured_requests");
const measuredNewTls = new Counter("measured_new_tls_requests");
const started = new Gauge("measurement_start_epoch_ms");
const ended = new Gauge("measurement_end_epoch_ms");
const statusCodes = [0, 200, 302, 400, 401, 403, 429, 500, 502, 503, "other"];
const statusCounters = Object.fromEntries(
  ["warm", "measured"].map((phase) => [
    phase,
    Object.fromEntries(
      statusCodes.map((code) => [
        String(code),
        new Counter(`${phase}_http_status_${code}`),
      ]),
    ),
  ]),
);
const refusedCounters = {
  warm: new Counter("warm_refused"),
  measured: new Counter("measured_refused"),
};
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
    http_reqs: [`count==${requests * (reuse ? 2 : 1)}`],
    measured_requests: [`count==${requests}`],
    measured_http_ms: ["p(95)<500", "p(99)<1500"],
    ...(!reuse ? { http_req_duration: ["p(95)<500", "p(99)<1500"] } : {}),
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
  const validate = (response, phase = "measured") => {
    const status = statusCodes.includes(response.status)
      ? String(response.status)
      : "other";
    statusCounters[phase][status].add(1);
    refusedCounters[phase].add(
      response.status === 0 &&
        /refused|recusou ativamente|ECONNREFUSED/i.test(response.error ?? "")
        ? 1
        : 0,
    );
    const ok = check(response, {
      "concurrent request HTTP 200 without redirect": (r) => r.status === 200,
    });
    failures.add(!ok);
    return ok;
  };
  if (reuse) {
    const warmResponses = http.batch(batch);
    let valid = true;
    for (const response of warmResponses) {
      warmHttp.add(response.timings.duration);
      if (!validate(response, "warm")) valid = false;
    }
    if (!valid) throw new Error("Connection warm-up failed");
    sleep(2);
  }
  const start = Date.now();
  started.add(start);
  const responses = http.batch(batch);
  ended.add(Date.now());
  burstWall.add(Date.now() - start);
  for (const response of responses) {
    validate(response);
    measuredCount.add(1);
    measuredHttp.add(response.timings.duration);
    measuredTls.add(response.timings.tls_handshaking);
    measuredNewTls.add(response.timings.tls_handshaking > 0 ? 1 : 0);
  }
  sleep(3);
}
