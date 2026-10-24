import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { withBrowser } from "./browser.mjs";
import { writeEvidence } from "./evidence.mjs";
import { actionResult, fixtures, transport } from "./http.mjs";
import { labOrigin } from "./scope.mjs";
import { openLabDb } from "./state.mjs";

const data = fixtures();
const user = data.users.find((u) => u.name === "a");
const sql = await openLabDb();
const cases = [];
let capture;
let requests = 0;
try {
  await withBrowser(async ({ navigate, evaluate, wait, send, events }) => {
    events.add((event) => {
      if (event.method !== "Network.requestWillBeSent") return;
      const request = event.params.request;
      const actionId = Object.entries(request.headers).find(
        ([name]) => name.toLowerCase() === "next-action",
      )?.[1];
      if (
        request.url.startsWith(`${labOrigin}/`) &&
        request.method === "POST" &&
        request.postData === "[]" &&
        actionId
      ) {
        capture = { path: new URL(request.url).pathname, actionId };
        requests++;
      }
    });
    await navigate("/login");
    await wait(
      "(() => {const f=document.querySelector('form');return !!f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&typeof f[k]?.onSubmit==='function');})()",
      "login hydration",
    );
    await evaluate(
      `(() => {const f=document.querySelector('form');for(const [name,value] of Object.entries(${JSON.stringify({ email: user.email, password: "Guardian Bay laboratory passphrase 2026" })})){const i=f.elements.namedItem(name);Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i),'value').set.call(i,value);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));}f.requestSubmit();})()`,
    );
    await wait("location.pathname==='/account'", "login account");
    await wait(
      "[...document.querySelectorAll('button')].some(b=>b.textContent==='Sair'&&Object.keys(b).some(k=>k.startsWith('__reactProps$')&&typeof b[k]?.onClick==='function'))",
      "account hydration",
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    const { cookies } = await send("Network.getCookies", { urls: [labOrigin] });
    const token = cookies.find(
      (c) => c.name === "__Host-guardian-session",
    )?.value;
    assert.ok(token);
    const hash = createHash("sha256").update(token).digest("hex");
    await sql`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',last_active_at=clock_timestamp()-interval '26 minutes' WHERE token_hash=${hash}`;
    const [before] =
      await sql`SELECT last_active_at,expires_at FROM sessions WHERE token_hash=${hash}`;
    const interact = async () => {
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: 5,
        y: 400,
        button: "left",
        clickCount: 1,
      });
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: 5,
        y: 400,
        button: "left",
        clickCount: 1,
      });
    };
    await interact();
    const deadline = Date.now() + 15000;
    let after;
    while (Date.now() < deadline) {
      [after] =
        await sql`SELECT last_active_at,expires_at FROM sessions WHERE token_hash=${hash}`;
      if (after.last_active_at > before.last_active_at) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(
      after.last_active_at > before.last_active_at,
      "First actual interaction near idle must renew activity",
    );
    assert.equal(after.expires_at.getTime(), before.expires_at.getTime());
    assert.ok(capture);
    cases.push({
      id: "UI_NEAR_IDLE",
      expected:
        "First visible interaction near idle renews activity without extending absolute expiry",
      observed:
        "Real browser input reached Action; PostgreSQL activity advanced; absolute expiry unchanged",
      status: "PASS",
    });
    await interact();
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(requests, 1);
    cases.push({
      id: "UI_THROTTLE",
      expected:
        "Immediate repeated input does not issue another activity request",
      observed: `Browser activity requests=${requests}`,
      status: "PASS",
    });
    const replay = async (args, withCookie = true, origin = labOrigin) =>
      transport(capture.path, {
        method: "POST",
        token: withCookie ? token : undefined,
        body: JSON.stringify(args),
        headers: {
          "next-action": capture.actionId,
          "content-type": "text/plain;charset=UTF-8",
          accept: "text/x-component",
          origin,
        },
      });
    const extra = await replay([
      { userId: data.users.find((u) => u.name === "b").id },
    ]);
    assert.equal(actionResult(extra.text)?.code, "INVALID_INPUT");
    const anonymous = await replay([], false);
    assert.equal(actionResult(anonymous.text)?.code, "UNAUTHENTICATED");
    const forged = await replay([], true, "https://outside.invalid");
    assert.ok(forged.status >= 400);
    cases.push({
      id: "ACTIVITY_BOUNDARY",
      expected: "Extra authority, anonymous requests and forged Origin fail",
      observed: "INVALID_INPUT; UNAUTHENTICATED; forged Origin rejected",
      status: "PASS",
    });
    await sql`UPDATE sessions SET last_active_at=clock_timestamp()-interval '31 minutes' WHERE token_hash=${hash}`;
    const [expired] =
      await sql`SELECT last_active_at FROM sessions WHERE token_hash=${hash}`;
    await evaluate(
      "(() => {const original=performance.now.bind(performance);Object.defineProperty(performance,'now',{value:()=>original()+360000});})()",
    );
    await interact();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const denied = await replay([]);
    assert.equal(actionResult(denied.text)?.code, "UNAUTHENTICATED");
    const [stillExpired] =
      await sql`SELECT last_active_at FROM sessions WHERE token_hash=${hash}`;
    assert.equal(
      stillExpired.last_active_at.getTime(),
      expired.last_active_at.getTime(),
    );
    cases.push({
      id: "ACTIVITY_SERVER_CLOCK",
      expected:
        "Client clock manipulation cannot revive a server-expired session",
      observed:
        "Aged fixture remained expired after browser input and replay; PostgreSQL activity unchanged",
      status: "PASS",
    });
  });
} finally {
  await sql.end({ timeout: 5 });
}
writeEvidence("task-06-session-activity", cases);
