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
import sharp from "sharp";
import { startAdminFixture } from "./admin-ui-fixture.mjs";

// UI fixture only: database access throws, all browser POST requests are blocked.
test(
  "Admin and system UI: responsive navigation, dialogs, errors and static images",
  { timeout: 180000 },
  async () => {
    const binary = process.env.SECURITY_BROWSER_PATH;
    assert.ok(
      binary && existsSync(binary),
      "Set SECURITY_BROWSER_PATH to Chrome",
    );
    const fixture = await startAdminFixture();
    const origin = new URL(fixture.origin);
    const directory = resolve(".vitest/admin-browser");
    mkdirSync(directory, { recursive: true });
    const uploadBytes = await sharp({
      create: { width: 40, height: 24, channels: 3, background: "#fdc656" },
    })
      .webp()
      .toBuffer();
    const uploadFile = resolve(directory, "product-upload.webp");
    writeFileSync(uploadFile, uploadBytes);
    let uploadMode = "success";
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
          if (new URL(request.url).pathname === "/api/admin/product-images") {
            const body =
              uploadMode === "success"
                ? {
                    success: true,
                    mediaId: "00000000-0000-4000-8000-000000000001",
                    image: {
                      kind: "upload",
                      id: "00000000-0000-4000-8000-000000000001",
                      src: "/media/products/00000000-0000-4000-8000-000000000001",
                      alt: "Prévia",
                      width: 40,
                      height: 24,
                    },
                  }
                : { success: false, code: "INVALID_IMAGE" };
            setTimeout(() => {
              void send("Fetch.fulfillRequest", {
                requestId: event.params.requestId,
                responseCode: uploadMode === "success" ? 201 : 400,
                responseHeaders: [
                  { name: "Content-Type", value: "application/json" },
                ],
                body: Buffer.from(JSON.stringify(body)).toString("base64"),
              }).catch(() => {});
            }, 400);
            return;
          }
          if (new URL(request.url).pathname.startsWith("/media/products/")) {
            void send("Fetch.fulfillRequest", {
              requestId: event.params.requestId,
              responseCode: 200,
              responseHeaders: [{ name: "Content-Type", value: "image/webp" }],
              body: uploadBytes.toString("base64"),
            }).catch(() => {});
            return;
          }
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
      for (const width of [1440, 768, 390, 320]) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        for (const path of [
          "/admin",
          "/admin/catalog",
          "/admin/categories",
          "/admin/orders",
          `/admin/orders/${fixtureId}`,
          `/admin/catalog/${fixtureId}`,
          "/admin/catalog/new",
          "/access-denied",
          "/missing-ui-page",
        ]) {
          await navigate(path);
          if (width === 1440 && path === "/admin") {
            await evaluate(
              "document.querySelector('a[href=\"#main-content\"]').click()",
            );
            assert.equal(
              await evaluate("document.activeElement.id"),
              "main-content",
            );
            await send("Input.dispatchKeyEvent", {
              type: "keyDown",
              key: "Tab",
              code: "Tab",
              windowsVirtualKeyCode: 9,
            });
            await send("Input.dispatchKeyEvent", {
              type: "keyUp",
              key: "Tab",
              code: "Tab",
              windowsVirtualKeyCode: 9,
            });
            assert.equal(
              await evaluate(
                "document.querySelector('main').contains(document.activeElement)",
              ),
              true,
              "skip bypasses sidebar",
            );
          }
          await evaluate(
            "document.images.length && document.images[document.images.length-1].scrollIntoView({block:'center'})",
          );
          await wait(
            "[...document.images].every(image=>image.complete && image.naturalWidth>0)",
            `loaded images ${path}`,
          );
          await evaluate("scrollTo(0,0)");
          assert.equal(
            await evaluate(
              "document.documentElement.scrollWidth <= innerWidth",
            ),
            true,
            `no page overflow at ${width}: ${path}`,
          );
          assert.equal(
            await evaluate(
              "[...document.images].every(image=>image.complete && image.naturalWidth>0)",
            ),
            true,
            `images load: ${path}`,
          );
          assert.equal(
            await evaluate("document.querySelectorAll('#main-content').length"),
            1,
            "one skip target",
          );
          if (path.startsWith("/admin")) {
            assert.equal(
              await evaluate(
                "!!document.querySelector('nav[aria-label=\"Navegação principal\"]')",
              ),
              false,
              "no store navigation in Admin",
            );
            if (width === 1440)
              await send("Page.captureScreenshot", { format: "png" }).then(
                (result) =>
                  writeFileSync(
                    resolve(directory, `${path.replaceAll("/", "-")}.png`),
                    Buffer.from(result.data, "base64"),
                  ),
              );
          }
        }
      }
      await navigate("/admin/catalog/new");
      await wait(
        "!!document.querySelector('input[type=file]') && Object.keys(document.querySelector('input[type=file]')).some(k=>k.startsWith('__reactProps$')) && !document.querySelector('[inert]')",
        "upload field hydrates",
      );
      const selectFile = async () => {
        const { root } = await send("DOM.getDocument");
        const { nodeId } = await send("DOM.querySelector", {
          nodeId: root.nodeId,
          selector: "input[type=file]",
        });
        await send("DOM.setFileInputFiles", { nodeId, files: [uploadFile] });
      };
      await selectFile();
      await wait(
        "!!document.querySelector('progress') && document.querySelector('button[type=submit]').disabled",
        "upload blocks product save while pending",
      );
      await wait(
        "document.body.innerText.includes('Imagem pronta') && !!document.querySelector('fieldset img')",
        "successful upload shows preview",
      );
      await evaluate(
        "[...document.querySelectorAll('button')].find(b=>b.textContent==='Remover imagem').click()",
      );
      await wait(
        "!document.querySelector('fieldset img')",
        "remove restores placeholder",
      );
      uploadMode = "failure";
      await selectFile();
      await wait(
        "document.body.innerText.includes('Não foi possível enviar') && document.querySelector('button[type=submit]').disabled",
        "failed upload cannot save silently",
      );
      await evaluate(
        "[...document.querySelectorAll('button')].find(b=>b.textContent==='Cancelar seleção').click()",
      );
      await wait(
        "!document.querySelector('button[type=submit]').disabled",
        "cancel restores ability to save previous selection",
      );
      await send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate("/admin");
      await wait(
        "Object.keys(document.querySelector('button')).some(k=>k.startsWith('__reactProps$'))",
        "navigation hydrated",
      );
      await evaluate(
        "[...document.querySelectorAll('button')].find(b=>b.textContent==='Menu').click()",
      );
      await wait(
        "!!document.querySelector('[role=dialog]')",
        "mobile drawer opens",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=dialog]').contains(document.activeElement)",
        ),
        true,
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
        "Escape closes Drawer",
      );
      await wait(
        "document.activeElement.textContent==='Menu'",
        "focus returns to Drawer trigger",
      );
      await navigate("/admin/categories");
      await wait(
        "Object.keys(document.querySelector('main button')).some(k=>k.startsWith('__reactProps$'))",
        "category dialog hydrated",
      );
      await evaluate("document.querySelector('main button').click()");
      await wait(
        "!!document.querySelector('[role=dialog] input[name=name]')",
        "category form opens",
      );
      assert.equal(await evaluate("document.activeElement.name"), "name");
      await evaluate(
        "[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Fechar').click()",
      );
      await wait("!document.querySelector('[role=dialog]')", "category closes");
      await navigate("/admin/catalog?query=empty");
      assert.equal(
        await evaluate(
          "document.querySelector('main').textContent.includes('Nenhum produto')",
        ),
        true,
      );
      await navigate("/admin/catalog?query=fail");
      await wait(
        "!!document.querySelector('img[src*=unexpected-error]') || document.querySelector('h1')?.textContent==='Vamos retomar o caminho.'",
        "error boundary recovers safely",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('main').textContent.includes('Fixture unavailable')",
        ),
        false,
      );
      await wait(
        "Object.keys(document.querySelector('main button')).some(k=>k.startsWith('__reactProps$') && typeof document.querySelector('main button')[k]?.onClick==='function')",
        "retry button hydrated",
      );
      await evaluate("document.querySelector('main button').click()");
      await wait(
        "document.querySelector('h1')?.textContent==='Produtos'",
        "retry re-fetches and recovers the failed segment",
      );
      await send("Network.setCookie", {
        name: "ui-access",
        value: "customer",
        url: origin.origin,
      });
      await navigate("/admin");
      assert.equal(
        await evaluate("document.querySelector('h1').textContent"),
        "Esta área precisa de permissão.",
      );
      assert.equal(
        await evaluate(
          "!!document.querySelector('nav[aria-label=\"Administração\"]')",
        ),
        false,
        "denied user never receives Admin navigation",
      );
      await send("Network.setCookie", {
        name: "ui-access",
        value: "anonymous",
        url: origin.origin,
      });
      await navigate("/admin");
      await wait(
        "location.pathname==='/login'",
        "anonymous visitor reaches login",
      );
      await send("Network.setCookie", {
        name: "ui-user",
        value: "present",
        url: origin.origin,
      });
      for (const access of ["customer", "admin"]) {
        await send("Network.setCookie", {
          name: "ui-access",
          value: access,
          url: origin.origin,
        });
        await navigate("/access-denied");
        await wait(
          "!!document.querySelector('button[aria-label^=\"Menu de usuário\"]') && Object.keys(document.querySelector('button[aria-label^=\"Menu de usuário\"]')).some(k=>k.startsWith('__reactProps$'))",
          "user menu hydrates",
        );
        await evaluate(
          "document.querySelector('button[aria-label^=\"Menu de usuário\"]').focus()",
        );
        await send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
        });
        await send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
        });
        await wait(
          "!!document.querySelector('[role=menu]')",
          "user menu opens by keyboard",
        );
        assert.equal(
          await evaluate(
            "!!document.querySelector('[role=menuitem][href=\"/admin\"]')",
          ),
          access === "admin",
          "Admin visibility follows server permission",
        );
        assert.equal(
          await evaluate(
            "document.querySelector('[role=menuitem][href=\"/account\"]').textContent",
          ),
          "Meu perfil",
        );
        assert.equal(
          await evaluate("document.documentElement.scrollWidth <= innerWidth"),
          true,
          "user menu fits mobile",
        );
        if (access === "admin") {
          await evaluate(
            "[...document.querySelectorAll('[role=menuitem]')].find(item=>item.textContent==='Sair').click()",
          );
          await wait(
            "document.querySelector('[role=menu] output')?.textContent.includes('Não foi possível sair')",
            "logout transport failure remains visible without false success",
          );
          assert.equal(await evaluate("location.pathname"), "/access-denied");
        }
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
          "!document.querySelector('[role=menu]') && document.activeElement.getAttribute('aria-label')?.startsWith('Menu de usuário')",
          "Escape restores user menu focus",
        );
      }
      await send("Network.setCookie", {
        name: "ui-access",
        value: "admin",
        url: origin.origin,
      });
      for (const width of [1440, 390]) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await navigate("/admin");
        await wait(
          "!document.querySelector('[inert]') && !document.querySelector('.gb-curtain')",
          "context releases administrative menu",
        );
        await wait(
          "!!document.querySelector('header button[aria-label^=\"Menu de usuário\"]') && Object.keys(document.querySelector('header button[aria-label^=\"Menu de usuário\"]')).some(k=>k.startsWith('__reactProps$'))",
          "administrative user menu hydrates",
        );
        await evaluate(
          "document.querySelector('header button[aria-label^=\"Menu de usuário\"]').focus()",
        );
        await send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
        });
        await send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "ArrowDown",
          code: "ArrowDown",
          windowsVirtualKeyCode: 40,
        });
        await wait(
          "!!document.querySelector('[role=menu]')",
          "administrative menu opens",
        );
        assert.deepEqual(
          await evaluate(
            "[...document.querySelectorAll('[role=menuitem][href]')].map(item=>item.getAttribute('href'))",
          ),
          [
            "/admin",
            "/admin/catalog",
            "/admin/categories",
            "/admin/orders",
            "/admin/audit",
            "/account",
            "/",
          ],
        );
        assert.equal(
          await evaluate(
            "document.querySelector('[role=menu]').getBoundingClientRect().right <= innerWidth",
          ),
          true,
          "admin menu fits viewport",
        );
        await evaluate(
          "document.querySelector('[role=menuitem][href=\"/admin/categories\"]').click()",
        );
        await wait(
          "location.pathname==='/admin/categories' && document.querySelector('h1')?.textContent==='Categorias'",
          "administrative menu link navigates",
        );
      }
      // One expected exception is produced by the deliberate error-boundary fixture.
      assert.ok(errors.length <= 1, "no unrelated runtime errors");
    } finally {
      socket?.close();
      for (const entry of pending.values()) clearTimeout(entry.timer);
      child.kill();
      fixture.server.kill();
    }
  },
);
