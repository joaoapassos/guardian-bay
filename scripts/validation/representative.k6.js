import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// Calibration only. Higher stages require a separately reviewed sustained runner.
const origin = "https://127.0.0.1:3449";
if (
  __ENV.LAB_BASE_URL !== origin ||
  __ENV.TEST_DATABASE_URL !==
    "postgresql://postgres@127.0.0.1:55442/guardian_bay_test" ||
  __ENV.LAB_VUS !== "2" ||
  __ENV.LAB_SECONDS !== "180"
)
  throw new Error("Calibration scope exceeded");
const data = JSON.parse(
  open("../../.vitest/epic12/representative-fixtures.json"),
);
const lease = JSON.parse(open("../../.vitest/epic12/lease.json"));
const captures = JSON.parse(open("../../.vitest/epic12/captures.json"));
if (
  data.runId !== lease.runId ||
  data.buildId !== open("../../.next/BUILD_ID").trim() ||
  data.users.length !== 2 ||
  Date.now() - Date.parse(lease.createdAt) >= 86400000 ||
  Date.now() < Date.parse(lease.createdAt)
)
  throw new Error("Stale calibration inputs");
const failures = new Rate("unexpected_failures");
const reads = new Trend("representative_read_ms", true);
const writes = new Trend("representative_write_ms", true);
export const options = {
  scenarios: {
    calibration: {
      executor: "per-vu-iterations",
      vus: 2,
      iterations: 1,
      maxDuration: "180s",
      gracefulStop: "0s",
    },
  },
  maxRedirects: 0,
  insecureSkipTLSVerify: true,
  summaryTrendStats: ["med", "p(95)", "p(99)", "max"],
  thresholds: {
    checks: ["rate==1"],
    unexpected_failures: ["rate<0.01"],
    representative_read_ms: ["p(95)<500", "p(99)<1500"],
    representative_write_ms: ["p(95)<1500", "p(99)<3000"],
    iterations: ["count==2"],
  },
};
function get(path, user) {
  const r = http.get(origin + path, {
    headers: { cookie: `__Host-guardian-session=${user.token}` },
    timeout: "10s",
    tags: { name: path.startsWith("/orders/") ? "order-detail" : path },
  });
  reads.add(r.timings.duration);
  const ok = check(r, {
    "authenticated page HTTP 200": (v) => v.status === 200,
  });
  failures.add(!ok);
}
function action(name, input, user) {
  const capture = captures[name];
  if (
    !capture?.actionId ||
    !capture.path.startsWith("/") ||
    capture.path.startsWith("//")
  )
    throw new Error("Missing local Action capture");
  const r = http.post(origin + capture.path, JSON.stringify([input]), {
    headers: {
      "next-action": capture.actionId,
      "content-type": "text/plain;charset=UTF-8",
      accept: "text/x-component",
      origin,
      cookie: `__Host-guardian-session=${user.token}`,
    },
    timeout: "10s",
    tags: { name: `action-${name}` },
  });
  writes.add(r.timings.duration);
  let result;
  for (const line of r.body.split("\n")) {
    try {
      const value = JSON.parse(line.slice(line.indexOf(":") + 1));
      if (typeof value?.success === "boolean") result = value;
    } catch {
      /* Flight records */
    }
  }
  const ok = check(r, {
    "commercial success": () => r.status === 200 && result?.success === true,
  });
  failures.add(!ok);
  if (!ok) throw new Error("Commercial calibration failed");
  return result;
}
export default function () {
  const user = data.users[__VU - 1];
  get("/products", user);
  get("/account", user);
  for (const method of ["CARD", "PIX", "BOLETO"]) {
    get(`/products/${data.productId}`, user);
    action("addCart", { productId: data.productId, quantity: 1 }, user);
    get("/cart", user);
    action("updateCart", { productId: data.productId, quantity: 1 }, user);
    get("/checkout", user);
    const order = action(
      "checkout",
      {
        checkoutKey: crypto.randomUUID(),
        payment:
          method === "CARD" ? { method, cardId: user.cardId } : { method },
      },
      user,
    );
    get(`/orders/${order.orderId}`, user);
    if (method !== "CARD") {
      sleep(method === "PIX" ? 31 : 61);
      const paid = action("confirmPayment", { orderId: order.orderId }, user);
      const ok = check(paid, {
        "backend approved after natural interval": (v) => v.status === "PAID",
      });
      failures.add(!ok);
    } else {
      const ok = check(order, {
        "test card approved by backend": (v) => v.status === "PAID",
      });
      failures.add(!ok);
    }
    get("/orders", user);
    sleep(1);
  }
}
