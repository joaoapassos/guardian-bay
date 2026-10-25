import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import { navigationCohort, navigationStages } from "./navigation-contract.mjs";

const origin = "https://127.0.0.1:3449";
if (
  __ENV.LAB_BASE_URL !== origin ||
  __ENV.TEST_DATABASE_URL !==
    "postgresql://postgres@127.0.0.1:55442/guardian_bay_test"
)
  throw new Error("Unauthorized navigation scope");
const vus = Number(__ENV.LAB_VUS),
  seconds = Number(__ENV.LAB_SECONDS);
if (!navigationStages.some((s) => s.vus === vus && s.seconds === seconds))
  throw new Error("Invalid navigation plateau");
const users = new SharedArray(
  "navigation identities",
  () => JSON.parse(open("../../.vitest/epic12/navigation-fixtures.json")).users,
);
const fixture = JSON.parse(
  open("../../.vitest/epic12/navigation-fixtures.json"),
);
const productId = fixture.productId;
const lease = JSON.parse(open("../../.vitest/epic12/lease.json"));
const captures = JSON.parse(open("../../.vitest/epic12/captures.json"));
if (
  fixture.runId !== lease.runId ||
  captures._meta?.buildId !== fixture.buildId ||
  fixture.buildId !== open("../../.next/BUILD_ID").trim() ||
  Date.now() - Date.parse(lease.createdAt) >= 86400000
)
  throw new Error("Stale navigation inputs");
// Retain only shared identities, not1000copies of the complete private fixture.
fixture.users = null;
const failures = new Rate("unexpected_failures"),
  reads = new Trend("nav_read_ms", true),
  writes = new Trend("nav_write_ms", true);
const orders = new Counter("nav_orders"),
  requests = new Counter("nav_requests"),
  active = new Trend("nav_active_vus"),
  elapsed = new Trend("nav_plateau_elapsed_seconds");
const readCount = new Counter("nav_read_count"),
  writeCount = new Counter("nav_write_count");
const ordersByMethod = {
  CARD: new Counter("nav_orders_card"),
  PIX: new Counter("nav_orders_pix"),
  BOLETO: new Counter("nav_orders_boleto"),
};
const completedUsers = new Counter("nav_completed_users"),
  perUserReads = new Trend("nav_per_user_reads");
export const options = {
  scenarios: {
    navigation: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "60s", target: vus },
        { duration: `${seconds + 60}s`, target: vus },
      ],
      gracefulRampDown: "120s",
      gracefulStop: "120s",
    },
  },
  maxRedirects: 0,
  insecureSkipTLSVerify: true,
  discardResponseBodies: true,
  summaryTrendStats: ["min", "med", "p(95)", "p(99)", "max"],
  thresholds: {
    checks: ["rate==1"],
    unexpected_failures: [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "10s" },
    ],
    nav_read_ms: ["p(95)<500", "p(99)<1500"],
    nav_write_ms: ["p(95)<1500", "p(99)<3000"],
    nav_active_vus: [`min==${vus}`],
    nav_plateau_elapsed_seconds: [`max>=${seconds - 20}`],
    nav_read_count: [`count>=${Math.floor((vus * seconds) / 40)}`],
    nav_write_count: ["count>0"],
    nav_completed_users: [`count==${vus}`],
    nav_per_user_reads: [`min>=${Math.floor(seconds / 40)}`],
  },
};
let cartReady = false,
  lastCheckout = -240,
  lastActivity = -300;
let measuredReads = 0,
  reportedCompletion = false;
const time = () => exec.instance.currentTestRunDuration / 1000;
function measure(response, write, ok) {
  failures.add(!ok);
  const t = time();
  if (t >= 120 && t < 120 + seconds) {
    (write ? writes : reads).add(response.timings.duration);
    (write ? writeCount : readCount).add(1);
    if (!write) measuredReads++;
    requests.add(1);
    active.add(exec.instance.vusActive);
    elapsed.add(t - 120);
  }
  if (!ok)
    exec.test.abort(
      "Navigation contract failed; see sanitized aggregate report",
    );
}
function get(path, user) {
  const r = http.get(origin + path, {
    headers: { cookie: `__Host-guardian-session=${user.token}` },
    timeout: "10s",
    responseType: path === "/account" ? "text" : "none",
    tags: {
      name: path.startsWith("/products/")
        ? "product-detail"
        : path.startsWith("/orders/")
          ? "order-detail"
          : path,
    },
  });
  const ok = check(r, {
    "navigation HTTP200 and own account": (v) =>
      v.status === 200 && (path !== "/account" || v.body.includes(user.email)),
  });
  measure(r, false, ok);
}
function action(name, input, user) {
  const capture = captures[name];
  if (!capture?.actionId) exec.test.abort("Missing current Action capture");
  const r = http.post(
    origin + capture.path,
    JSON.stringify(name === "recordActivity" ? [] : [input]),
    {
      headers: {
        "next-action": capture.actionId,
        "content-type": "text/plain;charset=UTF-8",
        accept: "text/x-component",
        origin,
        cookie: `__Host-guardian-session=${user.token}`,
      },
      responseType: "text",
      timeout: "10s",
      tags: { name: `action-${name}` },
    },
  );
  let result;
  for (const line of (r.body ?? "").split("\n")) {
    try {
      const value = JSON.parse(line.slice(line.indexOf(":") + 1));
      if (typeof value?.success === "boolean") result = value;
    } catch {}
  }
  const ok = check(r, {
    "navigation Action server success": () =>
      r.status === 200 && result?.success === true,
  });
  measure(r, true, ok);
  return result;
}
export default function () {
  const user = users[__VU - 1],
    cohort = navigationCohort(__VU, vus);
  if (time() - lastActivity >= 300) {
    action("recordActivity", null, user);
    lastActivity = time();
  }
  if (
    cohort === "checkout" &&
    time() - lastCheckout >= 240 &&
    time() < 120 + seconds
  ) {
    lastCheckout = time();
    get(`/products/${productId}`, user);
    sleep(8 + Math.random() * 8);
    action("addCart", { productId, quantity: 1 }, user);
    action("updateCart", { productId, quantity: 1 }, user);
    get("/checkout", user);
    sleep(8 + Math.random() * 8);
    const slot = (Math.floor(((__VU - 1) * 100) / vus) + __ITER) % 10,
      method = slot < 6 ? "CARD" : slot < 9 ? "PIX" : "BOLETO";
    const order = action(
      "checkout",
      {
        checkoutKey: crypto.randomUUID(),
        payment:
          method === "CARD" ? { method, cardId: user.cardId } : { method },
      },
      user,
    );
    orders.add(1);
    ordersByMethod[method].add(1);
    get(`/orders/${order.orderId}`, user);
    if (method !== "CARD") {
      sleep(method === "PIX" ? 31 : 61);
      const paid = action("confirmPayment", { orderId: order.orderId }, user);
      if (paid.status !== "PAID")
        exec.test.abort("Backend payment approval missing");
    } else if (order.status !== "PAID")
      exec.test.abort("Test card approval missing");
    get("/orders", user);
  } else if (cohort === "cart") {
    if (!cartReady) {
      action("addCart", { productId, quantity: 1 }, user);
      cartReady = true;
    }
    if (__ITER % 6 === 0)
      action("updateCart", { productId, quantity: 1 + (__ITER % 2) }, user);
    get(__ITER % 2 === 0 ? "/cart" : `/products/${productId}`, user);
  } else if (cohort === "history") {
    get(__ITER % 2 === 0 ? "/orders" : "/account", user);
  } else {
    get(["/products", `/products/${productId}`, "/account"][__ITER % 3], user);
  }
  sleep(8 + Math.random() * 8);
  if (time() >= 120 + seconds - 20 && !reportedCompletion) {
    reportedCompletion = true;
    completedUsers.add(1);
    perUserReads.add(measuredReads);
  }
}
