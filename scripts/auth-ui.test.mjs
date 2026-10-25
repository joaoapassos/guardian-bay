import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

// An owned, empty browser profile; valid submissions are blocked before transport.
// This test exercises UI only and never creates accounts or opens a database.
test("Auth UI: validation, password visibility, network failure and reflow", async () => {
  const origin = new URL(
    process.env.AUTH_UI_BASE_URL ?? "http://127.0.0.1:3210",
  );
  assert.ok(["127.0.0.1", "localhost"].includes(origin.hostname));
  const binary = process.env.SECURITY_BROWSER_PATH;
  assert.ok(
    binary && existsSync(binary),
    "Set SECURITY_BROWSER_PATH to Chrome",
  );
  const directory = resolve(".vitest/auth-ui");
  mkdirSync(directory, { recursive: true });
  const profile = mkdtempSync(resolve(directory, "chrome-"));
  const child = spawn(
    binary,
    [
      "--headless",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  let socket;
  const pending = new Map();
  const events = new Set();
  let id = 0;
  const pause = (ms) => new Promise((done) => setTimeout(done, ms));
  try {
    const portFile = resolve(profile, "DevToolsActivePort");
    for (
      let i = 0;
      i < 200 && !existsSync(portFile) && child.exitCode === null;
      i++
    )
      await pause(50);
    assert.ok(existsSync(portFile), "Chrome must start");
    const [port, endpoint] = readFileSync(portFile, "utf8")
      .trim()
      .split(/\r?\n/);
    socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
    await new Promise((done, reject) => {
      socket.addEventListener("open", done, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (pending.has(message.id)) {
        const entry = pending.get(message.id);
        clearTimeout(entry.timer);
        pending.delete(message.id);
        if (message.error)
          entry.reject(new Error(JSON.stringify(message.error)));
        else entry.done(message.result);
      } else for (const handler of events) handler(message);
    });
    const call = (method, params = {}, sessionId) =>
      new Promise((done, reject) => {
        const current = ++id;
        const timer = setTimeout(() => {
          pending.delete(current);
          reject(new Error(`CDP timeout: ${method}`));
        }, 20000);
        pending.set(current, { done, reject, timer });
        socket.send(
          JSON.stringify({
            id: current,
            method,
            params,
            ...(sessionId ? { sessionId } : {}),
          }),
        );
      });
    const { targetId } = await call("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await call("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const send = (method, params) => call(method, params, sessionId);
    const evaluate = async (expression) => {
      const response = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      assert.ok(!response.exceptionDetails, "Browser evaluation must succeed");
      return response.result.value;
    };
    const wait = async (expression, label) => {
      for (let i = 0; i < 200; i++) {
        if (await evaluate(expression)) return;
        await pause(100);
      }
      assert.fail(label);
    };
    let blockedPosts = 0;
    let interceptedPost;
    const runtimeErrors = [];
    events.add((event) => {
      if (event.method === "Runtime.exceptionThrown")
        runtimeErrors.push(event.params.exceptionDetails.text);
      if (event.method !== "Fetch.requestPaused") return;
      const request = event.params.request;
      const blocked =
        request.method === "POST" ||
        !request.url.startsWith(`${origin.origin}/`);
      if (request.method === "POST") {
        blockedPosts++;
        interceptedPost = event.params.requestId;
        return;
      }
      void send(blocked ? "Fetch.failRequest" : "Fetch.continueRequest", {
        requestId: event.params.requestId,
        ...(blocked ? { errorReason: "Failed" } : {}),
      }).catch(() => {});
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", {
      patterns: [{ urlPattern: "*", requestStage: "Request" }],
    });
    for (const route of ["/login", "/register"]) {
      await send("Page.navigate", { url: origin.origin + route });
      await wait(
        "document.readyState==='complete' && !!document.querySelector('#email') && !!document.querySelector('form') && Object.keys(document.querySelector('form')).some(k=>k.startsWith('__reactProps$') && typeof document.querySelector('form')[k]?.onSubmit==='function')",
        "Form must hydrate",
      );
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await evaluate("document.fonts.ready.then(() => true)");
      const initial = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      writeFileSync(
        resolve(directory, `${route.slice(1)}.png`),
        Buffer.from(initial.data, "base64"),
      );
      assert.equal(
        await evaluate("document.querySelectorAll('main').length"),
        1,
      );
      assert.equal(
        await evaluate("document.querySelector('#password').autocomplete"),
        route === "/login" ? "current-password" : "new-password",
      );
      await evaluate("document.querySelector('form').requestSubmit()");
      await wait(
        "document.activeElement?.id==='email' && document.querySelector('#email').getAttribute('aria-invalid')==='true'",
        "Invalid form must focus email",
      );
      for (const [width, height] of [
        [1920, 1080],
        [1440, 900],
      ]) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        const layout = await evaluate(
          "({ height:innerHeight, scroll:document.documentElement.scrollHeight, regions:[...document.querySelectorAll('header,main,main section,aside,footer')].map(e=>({tag:e.tagName,height:e.getBoundingClientRect().height})) })",
        );
        assert.ok(
          layout.scroll <= layout.height,
          `Auth must fit ${route} ${width}x${height}: ${JSON.stringify(layout)}`,
        );
      }
      const icon = await evaluate(
        "(() => { const button=document.querySelector('button[aria-controls=\"password\"]'); const icon=button.getBoundingClientRect(); const input=document.querySelector('#password').getBoundingClientRect(); const submit=document.querySelector('button[type=submit]').getBoundingClientRect(); return {x:icon.x,y:icon.y,width:icon.width,height:icon.height,contained:icon.left>input.left && icon.right<input.right && icon.top>input.top && icon.bottom<input.bottom,smaller:icon.height<submit.height,cursor:getComputedStyle(button).cursor}; })()",
      );
      assert.equal(icon.contained, true, "Icon focus area stays inside input");
      assert.equal(icon.smaller, true, "Icon button is smaller than submit");
      assert.equal(icon.cursor, "pointer");
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: icon.x + icon.width / 2,
        y: icon.y + icon.height / 2,
      });
      assert.equal(
        await evaluate(
          "getComputedStyle(document.querySelector('button[aria-controls=\"password\"]')).backgroundColor",
        ),
        "rgba(0, 0, 0, 0)",
        "Icon hover has no background",
      );
      assert.equal(
        blockedPosts,
        route === "/login" ? 0 : 1,
        "Empty submit must not call an Action",
      );
      assert.ok(
        await evaluate(
          "!!document.querySelector('button[aria-controls=\"password\"]')",
        ),
        "Password visibility control must exist",
      );
      await evaluate(
        "(() => { const input=document.querySelector('#password'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'  Test passphrase 2026!  '); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('button[aria-controls=\"password\"]').click(); })()",
      );
      await wait(
        "document.querySelector('#password').type==='text'",
        "Password must become visible",
      );
      assert.equal(
        await evaluate("document.querySelector('#password').value"),
        "  Test passphrase 2026!  ",
      );
      await evaluate(
        "document.querySelector('button[aria-controls=\"password\"]').click()",
      );
      await wait(
        "document.querySelector('#password').type==='password'",
        "Password must become hidden",
      );
      for (const width of [1440, 768, 390, 320]) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: false,
        });
        assert.ok(
          await evaluate("document.documentElement.scrollWidth <= innerWidth"),
          `No horizontal overflow at ${width}`,
        );
        assert.ok(
          await evaluate(
            "document.querySelector('button[type=submit]').getBoundingClientRect().height>=44",
          ),
          "Submit touch target",
        );
      }
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      assert.equal(
        await evaluate(
          "matchMedia('(prefers-reduced-motion: reduce)').matches",
        ),
        true,
      );
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1100,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const shot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      writeFileSync(
        resolve(directory, `${route.slice(1)}-errors.png`),
        Buffer.from(shot.data, "base64"),
      );
      await evaluate(
        "(() => { const form=document.querySelector('form'); for(const [name,value] of Object.entries({email:'auth-ui@example.invalid',password:'  Test passphrase 2026!  '})){const input=form.elements.namedItem(name);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}form.requestSubmit(); })()",
      );
      await wait(
        "document.querySelector('form').getAttribute('aria-busy')==='true' && document.querySelector('button[type=submit]').disabled",
        "Submit must stay pending",
      );
      for (let i = 0; i < 100 && !interceptedPost; i++) await pause(50);
      assert.ok(interceptedPost, "Submission must be intercepted");
      await evaluate(
        "document.querySelector('form').requestSubmit(); document.querySelector('form').requestSubmit();",
      );
      await pause(200);
      assert.equal(
        blockedPosts,
        route === "/login" ? 1 : 2,
        "Repeated submission must not dispatch another Action",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('button[type=submit]').disabled",
        ),
        true,
      );
      await send("Fetch.failRequest", {
        requestId: interceptedPost,
        errorReason: "Failed",
      });
      interceptedPost = undefined;
      await wait(
        "document.querySelector('output')?.textContent.includes('Não foi possível')",
        "Transport failure must show safe feedback",
      );
      assert.equal(
        await evaluate("document.querySelector('#password').value"),
        "",
      );
      assert.equal(
        await evaluate("document.querySelector('#email').value"),
        "auth-ui@example.invalid",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('button[type=submit]').disabled",
        ),
        false,
      );
      assert.equal(await evaluate("location.pathname"), route);
    }
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await evaluate(
      "(() => { window.__routeAnimations = []; const start=document.startViewTransition.bind(document); document.startViewTransition=(...args)=>{const transition=start(...args);transition.ready.then(()=>{for(const animation of document.getAnimations()){const name=animation.animationName;if(name?.startsWith('gb-page-'))window.__routeAnimations.push(name);}}).catch(()=>{});return transition;}; document.querySelector('main a[href=\"/login\"]')?.click(); })()",
    );
    await wait(
      "location.pathname==='/login' && document.querySelector('h1')?.textContent==='Entrar'",
      "Client navigation completes",
    );
    await wait(
      "window.__routeAnimations.length>0",
      "Route navigation must animate using React ViewTransition",
    );
    assert.ok(
      await evaluate("window.__routeAnimations.includes('gb-page-fade-in')"),
    );
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await evaluate(
      "window.__routeAnimations=[]; document.querySelector('main a[href=\"/register\"]')?.click()",
    );
    await wait(
      "location.pathname==='/register' && document.querySelector('h1')?.textContent==='Criar conta'",
      "Reduced-motion navigation completes",
    );
    await pause(250);
    assert.equal(
      await evaluate("window.__routeAnimations.length"),
      0,
      "Reduced-motion preference disables route animation",
    );
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await evaluate(
      "document.startViewTransition=undefined; document.querySelector('main a[href=\"/login\"]')?.click()",
    );
    await wait(
      "location.pathname==='/login' && document.querySelector('h1')?.textContent==='Entrar'",
      "Navigation works without ViewTransition support",
    );
    assert.equal(
      blockedPosts,
      2,
      "Each valid UI submit was intercepted, never sent",
    );
    assert.deepEqual(runtimeErrors, []);
  } finally {
    socket?.close();
    for (const entry of pending.values()) clearTimeout(entry.timer);
    child.kill();
  }
});
