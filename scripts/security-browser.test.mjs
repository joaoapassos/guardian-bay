import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("production HTTP headers and scaffold resources", async (t) => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3107",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const closed = once(server, "close");
  let ready = false;
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Ready in")) ready = true;
  });
  // Drain stderr without printing potentially sensitive runtime details.
  server.stderr.on("data", () => {});
  try {
    for (let i = 0; i < 100 && !ready && server.exitCode === null; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(ready, true, "owned production server must start");
    const base = "http://127.0.0.1:3107";
    for (const path of ["/", "/missing-security-resource", "/next.svg"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, path.includes("missing") ? 404 : 200);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(
        response.headers.get("referrer-policy"),
        "strict-origin-when-cross-origin",
      );
      assert.match(response.headers.get("permissions-policy"), /camera=\(\)/);
      assert.equal(response.headers.get("x-powered-by"), null);
      assert.equal(response.headers.get("strict-transport-security"), null);
      const csp = response.headers.get("content-security-policy");
      for (const directive of [
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self'",
        "font-src 'self'",
        "media-src 'none'",
        "frame-src 'none'",
        "worker-src 'none'",
        "manifest-src 'self'",
      ])
        assert.ok(csp.includes(directive), directive);
      assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*|data:|blob:/);
      if (path !== "/") continue;
      const html = await response.text();
      assert.match(html, /self\.__next_f/);
      const resources = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
        .map((match) => match[1].replaceAll("&amp;", "&"))
        .filter(
          (resource) =>
            resource.startsWith("/_next/static/") || resource.endsWith(".svg"),
        );
      assert.ok(resources.some((resource) => resource.endsWith(".js")));
      assert.ok(resources.some((resource) => resource.endsWith(".css")));
      assert.ok(resources.some((resource) => resource.endsWith(".woff2")));
      for (const resource of new Set(resources))
        assert.equal((await fetch(base + resource)).status, 200, resource);
    }
    await t.test(
      "Chromium runtime and CSP enforcement",
      { skip: !process.env.SECURITY_BROWSER_PATH },
      async () => {
        const root = resolve(".vitest");
        mkdirSync(root, { recursive: true });
        const profile = mkdtempSync(join(root, "security-browser-"));
        const browser = spawn(
          process.env.SECURITY_BROWSER_PATH,
          [
            "--headless",
            "--no-first-run",
            "--disable-extensions",
            "--disable-background-networking",
            "--remote-debugging-address=127.0.0.1",
            "--remote-debugging-port=3110",
            `--user-data-dir=${profile}`,
            "about:blank",
          ],
          { stdio: "ignore", windowsHide: true },
        );
        const browserClosed = once(browser, "close");
        let socket;
        try {
          let targets;
          for (
            let i = 0;
            i < 50 && !targets && browser.exitCode === null;
            i++
          ) {
            try {
              targets = await (
                await fetch("http://127.0.0.1:3110/json/list", {
                  signal: AbortSignal.timeout(300),
                })
              ).json();
            } catch {
              await new Promise((done) => setTimeout(done, 100));
            }
          }
          assert.ok(targets);
          socket = new WebSocket(
            targets.find((target) => target.type === "page")
              .webSocketDebuggerUrl,
          );
          await once(socket, "open", { signal: AbortSignal.timeout(5000) });
          let nextId = 0;
          const pending = new Map();
          const exceptions = [];
          const consoleErrors = [];
          socket.addEventListener("message", ({ data }) => {
            const message = JSON.parse(data);
            if (message.method === "Runtime.exceptionThrown")
              exceptions.push(message.params);
            if (
              message.method === "Runtime.consoleAPICalled" &&
              message.params.type === "error"
            )
              consoleErrors.push(message.params);
            if (message.id) {
              pending.get(message.id)?.(message);
              pending.delete(message.id);
            }
          });
          const call = (method, params = {}) =>
            new Promise((done, reject) => {
              const id = ++nextId;
              const timeout = setTimeout(() => {
                pending.delete(id);
                reject(new Error("Browser protocol timeout"));
              }, 5000);
              pending.set(id, (message) => {
                clearTimeout(timeout);
                done(message);
              });
              socket.send(JSON.stringify({ id, method, params }));
            });
          await call("Runtime.enable");
          await call("Page.enable");
          await call("Page.navigate", { url: base });
          let loaded = false;
          for (let i = 0; i < 100 && !loaded; i++) {
            const response = await call("Runtime.evaluate", {
              expression:
                "document.readyState === 'complete' && !!window.next && [...document.images].every(image => image.complete && image.naturalWidth > 0) && document.fonts.status === 'loaded'",
              returnByValue: true,
            });
            loaded = response.result?.result?.value === true;
            if (!loaded) await new Promise((done) => setTimeout(done, 100));
          }
          assert.equal(
            loaded,
            true,
            "Next runtime, local images and fonts must load",
          );
          assert.equal(
            exceptions.length,
            0,
            "runtime must not throw before CSP probes",
          );
          assert.equal(
            consoleErrors.length,
            0,
            "no hydration/runtime console errors",
          );
          for (const path of ["/login", "/register"]) {
            await call("Page.navigate", { url: base + path });
            let formReady = false;
            for (let i = 0; i < 100 && !formReady; i++) {
              const response = await call("Runtime.evaluate", {
                expression:
                  "!!document.querySelector('#email') && !!window.next && document.readyState === 'complete'",
                returnByValue: true,
              });
              formReady = response.result?.result?.value === true;
              if (!formReady) await new Promise((done) => setTimeout(done, 50));
            }
            assert.equal(formReady, true, "credential form must render");
            // Allow hydration, then submit an empty form: no network/DB needed.
            await new Promise((done) => setTimeout(done, 300));
            await call("Runtime.evaluate", {
              expression: "document.querySelector('form').requestSubmit()",
            });
            let validation = false;
            for (let i = 0; i < 100 && !validation; i++) {
              const response = await call("Runtime.evaluate", {
                expression:
                  "document.querySelector('#email-error')?.textContent === 'Informe um e-mail válido.' && document.activeElement.id === 'email'",
                returnByValue: true,
              });
              validation = response.result?.result?.value === true;
              if (!validation)
                await new Promise((done) => setTimeout(done, 50));
            }
            assert.equal(
              validation,
              true,
              "RHF validation must run and focus its invalid field",
            );
            const autocomplete = await call("Runtime.evaluate", {
              expression: "document.querySelector('#password').autocomplete",
              returnByValue: true,
            });
            assert.equal(
              autocomplete.result.result.value,
              path === "/login" ? "current-password" : "new-password",
            );
          }
          assert.equal(
            consoleErrors.length,
            0,
            "forms must hydrate without console errors",
          );
          await call("Runtime.evaluate", {
            expression: `window.securityViolations=[]; document.addEventListener('securitypolicyviolation', e=>window.securityViolations.push(e.effectiveDirective)); const image=document.createElement('img'); image.src='https://external.invalid/security.png'; document.body.append(image); const frame=document.createElement('iframe'); frame.src=location.origin; document.body.append(frame);`,
          });
          let violations = [];
          for (let i = 0; i < 100 && violations.length < 2; i++) {
            const response = await call("Runtime.evaluate", {
              expression: "window.securityViolations",
              returnByValue: true,
            });
            violations = response.result.result.value;
            if (violations.length < 2)
              await new Promise((done) => setTimeout(done, 50));
          }
          assert.ok(violations.includes("img-src"));
          assert.ok(violations.includes("frame-src"));
        } finally {
          socket?.close();
          browser.kill();
          await browserClosed;
          assert.ok(profile.startsWith(join(root, "security-browser-")));
          rmSync(profile, {
            recursive: true,
            force: true,
            maxRetries: 10,
            retryDelay: 100,
          });
        }
      },
    );
  } finally {
    server.kill();
    await closed;
  }
});
