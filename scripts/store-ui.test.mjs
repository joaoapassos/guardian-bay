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
import { startStoreFixture } from "./store-ui-fixture.mjs";

// UI fixture only: database access throws, all browser POST requests are blocked.
test(
  "Store UI: responsive pages, forms, filters and safe read fixtures",
  { timeout: 300000 },
  async () => {
    const binary = process.env.SECURITY_BROWSER_PATH;
    assert.ok(
      binary && existsSync(binary),
      "Set SECURITY_BROWSER_PATH to Chrome",
    );
    const fixture = await startStoreFixture();
    const origin = new URL(fixture.origin);
    const directory = resolve(".vitest/store-browser");
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
        assert.ok(
          !response.exceptionDetails,
          "Browser evaluation must succeed",
        );
        return response.result.value;
      };
      const wait = async (expression, label) => {
        for (let i = 0; i < 200; i++) {
          if (await evaluate(expression)) return;
          await pause(100);
        }
        const diagnostic = await evaluate(
          "document.body.innerText.slice(0,500)",
        );
        await send("Page.captureScreenshot", { format: "png" }).then((result) =>
          writeFileSync(
            resolve(directory, "failure.png"),
            Buffer.from(result.data, "base64"),
          ),
        );
        assert.fail(`${label}: ${diagnostic}`);
      };
      const errors = [];
      events.add((event) => {
        if (event.method === "Runtime.exceptionThrown")
          errors.push(event.params.exceptionDetails.text);
        if (event.method === "Fetch.requestPaused") {
          const request = event.params.request;
          const block =
            request.method === "POST" ||
            !request.url.startsWith(`${origin.origin}/`);
          void send(block ? "Fetch.failRequest" : "Fetch.continueRequest", {
            requestId: event.params.requestId,
            ...(block ? { errorReason: "Failed" } : {}),
          }).catch(() => {});
        }
      });
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Network.enable");
      await send("Network.setCookie", {
        name: "__Host-guardian-session",
        value: "a".repeat(64),
        url: origin.origin,
        path: "/",
        secure: true,
        httpOnly: true,
      });
      await send("Network.setCookie", {
        name: "ui-user",
        value: "present",
        url: origin.origin,
      });
      await send("Fetch.enable", {
        patterns: [{ urlPattern: "*", requestStage: "Request" }],
      });
      const navigate = async (path) => {
        await send("Page.navigate", { url: "about:blank" });
        await wait(
          "location.href==='about:blank' && document.readyState==='complete'",
          "previous document cleared",
        );
        await send("Page.navigate", { url: origin.origin + path });
        await wait(
          "document.readyState==='complete' && !!document.querySelector('h1')",
          `loaded ${path}`,
        );
      };
      const fixtureId = "00000000-0000-4000-8000-000000000001";
      const clickText = (text) =>
        evaluate(
          `([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}))?.click()`,
        );
      const hydrated = async () =>
        wait(
          "[...document.querySelectorAll('main button')].some(b=>Object.keys(b).some(k=>k.startsWith('__reactProps$')))",
          "interactive page hydrates",
        );
      for (const width of [1440, 768, 390, 320]) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        for (const path of [
          "/",
          "/products",
          `/products/${fixtureId}`,
          "/cart",
          "/checkout",
          "/account",
          "/account/addresses",
          "/orders",
          `/orders/${fixtureId}`,
        ]) {
          await navigate(path);
          if (path === "/") {
            await wait(
              "document.querySelectorAll('#home-products-title').length===1 && document.querySelectorAll('[aria-labelledby=home-products-title] li').length===8",
              "home shows eight products",
            );
          }
          await evaluate(
            "document.images.length && document.images[document.images.length-1].scrollIntoView({block:'center'})",
          );
          await wait(
            "[...document.images].every(image=>image.complete && image.naturalWidth>0)",
            `images ${path}`,
          );
          await evaluate("scrollTo(0,0)");
          assert.equal(
            await evaluate(
              "document.documentElement.scrollWidth <= innerWidth",
            ),
            true,
            `no overflow at ${width}: ${path}`,
          );
          assert.equal(
            await evaluate("document.querySelectorAll('#main-content').length"),
            1,
            "unique skip target",
          );
          assert.equal(
            await evaluate(
              "[...document.images].every(image=>image.hasAttribute('alt'))",
            ),
            true,
            "images declare text alternative",
          );
          assert.deepEqual(
            await evaluate(
              "[...document.querySelectorAll('main input:not([type=hidden]), main select, main textarea')].filter(el=>!el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(el=>el.outerHTML.slice(0,100))",
            ),
            [],
            `controls have labels: ${path}`,
          );
          if (path === "/checkout") {
            assert.equal(
              await evaluate(
                "document.querySelector('#checkout-address')?.options.length",
              ),
              1,
              `checkout offers private address: ${await evaluate("document.body.innerText")}`,
            );
            assert.equal(
              await evaluate(
                "document.querySelector('main').textContent.includes('preços vigentes')",
              ),
              true,
              "current price contract is explicit",
            );
          }
          if (path === "/" && width === 1440) {
            await evaluate(
              "document.querySelector('a[href=\"#main-content\"]').click()",
            );
            assert.equal(
              await evaluate("document.activeElement.id"),
              "main-content",
              "skip link focuses main",
            );
          }
          if (width === 1440) {
            const shot = await send("Page.captureScreenshot", {
              format: "png",
            });
            writeFileSync(
              resolve(directory, `${path.replaceAll("/", "-") || "home"}.png`),
              Buffer.from(shot.data, "base64"),
            );
          }
        }
      }
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate("/products");
      await hydrated();
      await evaluate(
        "document.querySelector('main input[name=query]').value='empty'; document.querySelector('main input[name=query]').form.requestSubmit()",
      );
      await wait(
        "location.search.includes('query=empty') && document.querySelector('main').textContent.includes('Nenhum produto')",
        "GET filters update URL and show empty state",
      );
      await navigate("/products?minPrice=10&maxPrice=1");
      await wait(
        "document.querySelector('[role=alert]')?.textContent.includes('Confira os filtros')",
        "invalid price range is visible",
      );
      await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate("/products");
      await hydrated();
      await clickText("Filtrar e ordenar");
      await wait(
        "!!document.querySelector('[role=dialog]')",
        "mobile filters open",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=dialog]').contains(document.activeElement)",
        ),
        true,
        "filter dialog owns focus",
      );
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await wait(
        "!document.querySelector('[role=dialog]')",
        "Escape closes filters",
      );
      await navigate(`/products/${fixtureId}`);
      await hydrated();
      await evaluate(
        "document.querySelector('main input[type=number]').focus()",
      );
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "ArrowUp",
        code: "ArrowUp",
        windowsVirtualKeyCode: 38,
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "ArrowUp",
        code: "ArrowUp",
        windowsVirtualKeyCode: 38,
      });
      assert.equal(
        await evaluate(
          "document.querySelector('main input[type=number]').value",
        ),
        "2",
        "quantity works by keyboard",
      );
      await navigate(
        `/login?returnTo=${encodeURIComponent(`/products/${fixtureId}`)}`,
      );
      assert.equal(
        await evaluate("new URL(location.href).searchParams.get('returnTo')"),
        `/products/${fixtureId}`,
        "login preserves return intent in URL",
      );
      await navigate("/account/addresses");
      await hydrated();
      await evaluate(
        "[...document.querySelectorAll('main button')].find(b=>b.textContent.trim().startsWith('Remover')).click()",
      );
      await wait(
        "!!document.querySelector('[role=alertdialog]')",
        "remove address asks confirmation",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=alertdialog]').contains(document.activeElement)",
        ),
        true,
        "confirmation owns focus",
      );
      await clickText("Cancelar");
      await wait(
        "!document.querySelector('[role=alertdialog]')",
        "cancel preserves address",
      );
      await clickText("Adicionar endereço");
      await wait(
        "!!document.querySelector('#address-recipient')",
        "address inline form opens",
      );
      assert.equal(
        await evaluate(
          "document.querySelectorAll('select#address-state option').length",
        ),
        28,
        "27 Brazilian states plus placeholder",
      );
      assert.equal(
        await evaluate("document.documentElement.scrollWidth <= innerWidth"),
        true,
        "address form fits mobile",
      );
      assert.deepEqual(errors, [], "no uncaught browser runtime errors");
    } finally {
      socket?.close();
      for (const entry of pending.values()) clearTimeout(entry.timer);
      child.kill();
      fixture.server.kill();
    }
  },
);
