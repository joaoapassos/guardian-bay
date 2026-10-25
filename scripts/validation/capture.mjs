import assert from "node:assert/strict";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withBrowser } from "./browser.mjs";
import { writeEvidence } from "./evidence.mjs";
import { fixtures, replay } from "./http.mjs";
import { labDirectory, labOrigin } from "./scope.mjs";

const data = fixtures();
const user = data.users.find((u) => u.name === "a");
const captures = {};
const cases = [];
let current;
await withBrowser(async ({ send, evaluate, wait, navigate, events }) => {
  events.add((event) => {
    if (event.method !== "Network.requestWillBeSent") return;
    const request = event.params.request;
    const actionId = Object.entries(request.headers).find(
      ([name]) => name.toLowerCase() === "next-action",
    )?.[1];
    if (
      request.url.startsWith(`${labOrigin}/`) &&
      request.method === "POST" &&
      actionId
    ) {
      if (request.postData === "[]") {
        captures.recordActivity = {
          path: new URL(request.url).pathname,
          actionId,
        };
        return;
      }
      if (!current) return;
      captures[current] = {
        path: new URL(request.url).pathname,
        actionId,
        body: request.postData ?? null,
      };
    }
  });
  const fill = async (values, selector = "form") => {
    await wait(
      `(() => {const f=document.querySelector(${JSON.stringify(selector)});return !!f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&(typeof f[k]?.onSubmit==='function'||typeof f[k]?.action==='function'));})()`,
      "hydration before input",
    );
    return evaluate(
      `(() => {const f=document.querySelector(${JSON.stringify(selector)});for(const [name,value] of Object.entries(${JSON.stringify(values)})){const i=f.elements.namedItem(name);Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i),'value').set.call(i,value);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));}})()`,
    );
  };
  const submit = async (selector) => {
    await wait(
      `(() => {const f=document.querySelector(${JSON.stringify(selector)});return !!f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&(typeof f[k]?.onSubmit==='function'||typeof f[k]?.action==='function'));})()`,
      "hydration",
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).requestSubmit()`,
    );
  };
  await navigate("/login");
  current = "login";
  await fill({
    email: user.email,
    password: "Guardian Bay laboratory passphrase 2026",
  });
  await submit("form");
  await wait("location.pathname==='/account'", "real login");
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent==='Sair'&&Object.keys(b).some(k=>k.startsWith('__reactProps$')&&typeof b[k]?.onClick==='function'))",
    "account hydration",
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const type of ["mousePressed", "mouseReleased"])
    await send("Input.dispatchMouseEvent", {
      type,
      x: 5,
      y: 400,
      button: "left",
      clickCount: 1,
    });
  const activityDeadline = Date.now() + 10000;
  while (!captures.recordActivity && Date.now() < activityDeadline)
    await new Promise((resolve) => setTimeout(resolve, 100));
  assert.ok(
    captures.recordActivity,
    "Real browser interaction must capture activity Action",
  );
  cases.push({
    id: "CAPTURE_LOGIN",
    expected: "Actual UI login reaches account",
    observed: "Account navigation after credential submission",
    status: "PASS",
  });
  const { cookies } = await send("Network.getCookies", { urls: [labOrigin] });
  const cookie = cookies.find((c) => c.name === "__Host-guardian-session");
  assert.ok(cookie?.httpOnly && cookie.secure && cookie.sameSite === "Lax");
  user.token = cookie.value;
  user.provisionedSession = false;
  writeFileSync(
    join(labDirectory, "fixtures.json"),
    JSON.stringify(data, null, 2),
    { mode: 0o600 },
  );
  current = "saveCard";
  await fill(
    {
      number: "0000 0000 0000 0002",
      cvv: "222",
      holder: "PESSOA DE TESTE",
      expiry: "12/2099",
    },
    'form[aria-label="Cadastrar cartão fictício"]',
  );
  await submit('form[aria-label="Cadastrar cartão fictício"]');
  await wait(
    "document.querySelector('main').textContent.includes('TEST •••• 0002')",
    "saved fixture",
  );
  current = "removeCard";
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Remover cartão fictício final 0002').click()",
  );
  await wait(
    "!document.querySelector('main').textContent.includes('TEST •••• 0002')",
    "removed fixture",
  );
  await navigate(`/products/${data.products[0].id}`);
  current = "addCart";
  await wait(
    "(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Adicionar ao carrinho');return !!b&&!b.disabled&&Object.keys(b).some(k=>k.startsWith('__reactProps$')&&typeof b[k]?.onClick==='function');})()",
    "add button hydration",
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='Adicionar ao carrinho').click()",
  );
  await wait(
    "[...document.querySelectorAll('output')].some(o=>o.textContent.includes('Produto adicionado'))",
    "cart add",
  );
  await navigate("/cart");
  current = "updateCart";
  await fill({ quantity: "2" }, 'form:has(input[name="quantity"])');
  await submit('form:has(input[name="quantity"])');
  await wait(
    "document.querySelector('input[name=quantity]').defaultValue==='2'",
    "cart update",
  );
  await navigate("/checkout");
  current = "checkout";
  await evaluate(
    "(() => {const s=document.querySelector('form[aria-label=\"Confirmar checkout\"] select');s.value='PIX';s.dispatchEvent(new Event('change',{bubbles:true}));})()",
  );
  await submit('form[aria-label="Confirmar checkout"]');
  await wait(
    "/^\\/orders\\/[a-f0-9-]+$/.test(location.pathname)&&!!document.querySelector('[role=timer]')",
    "pending Pix",
  );
  current = "confirmPayment";
  await wait(
    "[...document.querySelectorAll('button')].some(b=>b.textContent==='Confirmar pagamento simulado'&&!b.disabled)",
    "natural Pix eligibility",
    45000,
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirmar pagamento simulado').click()",
  );
  await wait(
    "document.querySelector('main').textContent.includes('Pagamento simulado aprovado')",
    "backend approval",
  );
  current = null;
});
for (const name of [
  "login",
  "saveCard",
  "removeCard",
  "addCart",
  "updateCart",
  "checkout",
  "confirmPayment",
  "recordActivity",
])
  assert.ok(captures[name]?.actionId, `Missing real capture: ${name}`);
const previousCaptures = join(labDirectory, "captures.json");
if (existsSync(previousCaptures))
  copyFileSync(
    previousCaptures,
    join(labDirectory, `captures-before-${Date.now()}.json`),
  );
captures._meta = {
  runId: data.runId,
  buildId: readFileSync(".next/BUILD_ID", "utf8").trim(),
  capturedAt: new Date().toISOString(),
};
writeFileSync(
  join(labDirectory, "captures.json"),
  JSON.stringify(captures, null, 2),
  { mode: 0o600 },
);
const positive = await replay(
  "saveCard",
  { fixtureId: "test-2", expiryMonth: 12, expiryYear: 2099 },
  { token: user.token },
);
assert.equal(
  positive.result?.success,
  true,
  "Captured Action must replay against real route",
);
cases.push({
  id: "CAPTURE_REAL_ACTIONS",
  expected: "Eight Action IDs captured from real UI, replay positive succeeds",
  observed:
    "Eight captured including activity; saveCard replay returned success",
  status: "PASS",
});
cases.push({
  id: "CAPTURE_NATURAL_TIME",
  expected: "Pix eligibility reached without modifying DB dates",
  observed: "UI waited natural interval and backend approved",
  status: "PASS",
});
writeEvidence("task-05-real-surface", cases, {
  actions: Object.keys(captures).filter((key) => key !== "_meta").length,
});
