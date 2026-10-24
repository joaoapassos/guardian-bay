import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { withBrowser } from "./browser.mjs";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, replay, transport } from "./http.mjs";
import { labDirectory } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const data = fixtures();
const a = data.users.find((u) => u.name === "a");
const b = data.users.find((u) => u.name === "b");
const cases = [];
const check = (id, expected, observed, passed) =>
  cases.push({ id, expected, observed, status: passed ? "PASS" : "FAIL" });
// Reauthenticate revoked B through the captured real login Action, without bypass.
const login = await replay("login", {
  email: b.email,
  password: "Guardian Bay laboratory passphrase 2026",
});
assert.equal(login.result?.success, true);
const setCookie = login.headers["set-cookie"]?.find((value) =>
  value.startsWith("__Host-guardian-session="),
);
assert.ok(setCookie);
b.token = setCookie.split(";")[0].split("=")[1];
b.provisionedSession = false;
writeFileSync(
  join(labDirectory, "fixtures.json"),
  JSON.stringify(data, null, 2),
  { mode: 0o600 },
);
const sql = await openLabDb();
try {
  const invalids = [
    { fixtureId: "unauthorized", expiryMonth: 12, expiryYear: 2099 },
    { fixtureId: "test-1", expiryMonth: 13, expiryYear: 2099 },
    {
      fixtureId: "test-1",
      expiryMonth: 12,
      expiryYear: 2099,
      pan: "0000000000000001",
      cvv: "111",
    },
  ];
  for (const [i, input] of invalids.entries()) {
    const result = await replay("saveCard", input, { token: b.token });
    check(
      `INPUT_CARD_${i}`,
      "Invalid fixture/expiry/raw financial fields rejected",
      `code=${result.result?.code}`,
      result.result?.code === "INVALID_INPUT",
    );
  }
  const negative = await replay(
    "addCart",
    { productId: data.products[0].id, quantity: -1 },
    { token: b.token },
  );
  check(
    "INPUT_QUANTITY",
    "Negative quantity rejected server-side",
    `code=${negative.result?.code}`,
    negative.result?.code === "INVALID_INPUT",
  );
  const injection = await transport(
    `/products?query=${encodeURIComponent("' OR '1'='1")}`,
  );
  const leaked = data.products.some((p) =>
    injection.text.includes(`/products/${p.id}`),
  );
  check(
    "INPUT_SQLI",
    "SQL-looking query remains literal and does not enumerate fixtures",
    `HTTP=${injection.status}; fixtureLinks=${leaked}`,
    injection.status === 200 && !leaked,
  );
  const payload = '<img src=x onerror="window.epic12Xss=1">';
  let domSafe = false;
  await withBrowser(async ({ navigate, evaluate }) => {
    await navigate(`/products?query=${encodeURIComponent(payload)}`);
    domSafe = await evaluate(
      `window.epic12Xss===undefined && document.querySelector('input[name=query]')?.value===${JSON.stringify(payload)} && !document.querySelector('img[onerror]')`,
    );
  });
  check(
    "INPUT_REFLECTED_XSS",
    "Search reflects text without event execution",
    `DOM safe=${domSafe}`,
    domSafe,
  );
  const error = await replay(
    "addCart",
    { productId: "' OR 1=1 --", quantity: 1 },
    { token: b.token },
  );
  const privateData =
    data.users.some((u) => error.text.includes(u.token)) ||
    /password_hash|postgresql:\/\/|PostgresError/.test(error.text);
  check(
    "PRIVACY_ERROR",
    "Invalid input returns sanitized result, no session/SQL internals",
    `code=${error.result?.code}; privateData=${privateData}`,
    error.result?.code === "INVALID_INPUT" && !privateData,
  );
  let limited = false;
  for (let i = 0; i < 11; i++) {
    const result = await replay(
      "removeCard",
      { cardId: randomUUID() },
      { token: a.token },
    );
    if (result.result?.code === "RATE_LIMITED") {
      limited = true;
      break;
    }
    assert.equal(result.result?.success, true);
  }
  const [budget] =
    await sql`SELECT attempts,expires_at FROM abuse_budgets WHERE user_id=${a.id} AND operation='payment.cards'`;
  check(
    "ABUSE_CAP",
    "Card budget stops at ten operations in real window",
    `limited=${limited}; attempts=${budget?.attempts}`,
    limited && budget?.attempts === 10,
  );
  const isolated = await replay(
    "removeCard",
    { cardId: randomUUID() },
    { token: b.token },
  );
  check(
    "ABUSE_ISOLATION",
    "A cap does not block B",
    `success=${isolated.result?.success}`,
    isolated.result?.success === true,
  );
  const expires = new Date(budget.expires_at).getTime();
  assert.ok(expires - Date.now() < 61000);
  while (Date.now() <= expires + 100)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(5000, expires + 101 - Date.now())),
    );
  const recovered = await replay(
    "removeCard",
    { cardId: randomUUID() },
    { token: a.token },
  );
  check(
    "ABUSE_NATURAL_RESET",
    "Budget recovers after natural server window",
    `success=${recovered.result?.success}`,
    recovered.result?.success === true,
  );
  await assertIntegrity(sql);
} finally {
  await sql.end();
}
writeEvidence("task-08-abuse-input", cases);
if (cases.some((c) => c.status === "FAIL")) process.exitCode = 1;
