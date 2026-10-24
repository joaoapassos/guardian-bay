import assert from "node:assert/strict";
import { withBrowser } from "./browser.mjs";
import { writeEvidence } from "./evidence.mjs";

let intercepted = false;
await withBrowser(async ({ navigate, evaluate, events }) => {
  events.add((event) => {
    if (
      event.method === "Fetch.requestPaused" &&
      event.params.request.url === "https://outside.invalid/epic12"
    )
      intercepted = true;
  });
  await navigate("/products");
  const result = await evaluate(
    "fetch('https://outside.invalid/epic12').then(()=>false,()=>true)",
  );
  assert.equal(result, true);
  assert.equal(
    intercepted,
    true,
    "CDP must intercept before any network dispatch",
  );
});
writeEvidence("task-11-browser-safety", [
  {
    id: "BROWSER_EGRESS",
    expected: "External fetch intercepted and blocked before network",
    observed: `intercepted=${intercepted}; fetch rejected; local TLS SPKI only`,
    status: "PASS",
  },
]);
