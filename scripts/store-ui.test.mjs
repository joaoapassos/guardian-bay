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
      let adminNavigationDelay = 0;
      let cartReadDelay = 0;
      events.add((event) => {
        if (event.method === "Runtime.exceptionThrown")
          errors.push(event.params.exceptionDetails.text);
        if (event.method === "Fetch.requestPaused") {
          const request = event.params.request;
          const block =
            request.method === "POST" ||
            !request.url.startsWith(`${origin.origin}/`);
          const proceed = () =>
            void send(block ? "Fetch.failRequest" : "Fetch.continueRequest", {
              requestId: event.params.requestId,
              ...(block ? { errorReason: "Failed" } : {}),
            }).catch(() => {});
          if (
            !block &&
            cartReadDelay &&
            new URL(request.url).pathname === "/api/cart"
          )
            setTimeout(proceed, cartReadDelay);
          else if (
            !block &&
            adminNavigationDelay &&
            new URL(request.url).pathname === "/admin"
          )
            setTimeout(proceed, adminNavigationDelay);
          else proceed();
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
          "/account/payment-methods",
          "/account/orders",
          `/account/orders/${fixtureId}`,
          "/sobre",
          "/ajuda",
          "/privacidade",
          "/termos",
          "/trocas-e-devolucoes",
        ]) {
          await navigate(path);
          const draft = [
            "/privacidade",
            "/termos",
            "/trocas-e-devolucoes",
          ].includes(path);
          if (
            [
              "/sobre",
              "/ajuda",
              "/privacidade",
              "/termos",
              "/trocas-e-devolucoes",
            ].includes(path)
          ) {
            assert.equal(
              await evaluate("document.querySelectorAll('main h1').length"),
              1,
              "one institutional page title",
            );
            assert.ok(
              await evaluate(
                "document.querySelector('meta[name=description]')?.content.length > 20",
              ),
              "page description exists",
            );
            assert.equal(
              await evaluate(
                "document.querySelector('meta[name=robots]')?.content.includes('noindex') ?? false",
              ),
              draft,
              "draft indexation is explicit",
            );
            assert.equal(
              await evaluate(
                "document.querySelector('main').textContent.includes('Em elaboração')",
              ),
              draft,
              "draft status is visible",
            );
            assert.equal(
              await evaluate(
                "[...document.querySelectorAll('footer a')].map(a=>a.getAttribute('href')).includes('/sobre')",
              ),
              true,
              "institutional footer is available",
            );
            if (path !== "/sobre") {
              const destination = await evaluate(
                "document.querySelector('nav[aria-label=\"Nesta página\"] a').getAttribute('href').slice(1)",
              );
              await evaluate(
                "document.querySelector('nav[aria-label=\"Nesta página\"] a').click()",
              );
              await wait(
                `location.hash===${JSON.stringify(`#${destination}`)} && document.activeElement.id===${JSON.stringify(destination)}`,
                "section anchor moves focus and updates URL",
              );
            }
          }
          if (path === "/checkout") {
            assert.equal(
              await evaluate(
                "document.querySelectorAll('footer nav[aria-label=\"Ajuda e políticas do checkout\"] a').length",
              ),
              4,
              "checkout keeps help and policies",
            );
          }
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
              2,
              `checkout offers private address: ${await evaluate("document.body.innerText")}`,
            );
            assert.equal(
              await evaluate(
                "document.querySelector('main').textContent.includes('confirmados novamente no servidor')",
              ),
              true,
              "current price contract is explicit",
            );
          }
          if (path.startsWith("/account")) {
            assert.equal(
              await evaluate(
                "document.querySelector('nav[aria-label=\"Navegação principal\"]')===null",
              ),
              true,
              "account hides the categories bar",
            );
            assert.equal(
              await evaluate(
                'document.querySelector(\'nav[aria-label="Navegação da conta"] a[href="/account/payment-methods"]\')!==null',
              ),
              true,
              "account owns saved payment navigation",
            );
          }
          if (path === "/account") {
            assert.equal(
              await evaluate("document.querySelector('#profile-name')?.value"),
              "Pessoa de teste",
              "saved name is editable",
            );
            assert.equal(
              await evaluate("document.querySelector('#profile-cpf')?.value"),
              "",
              "stored CPF is never hydrated into an input",
            );
            assert.equal(
              await evaluate(
                "document.querySelector('main').textContent.includes('•••.•••.•••-25')",
              ),
              true,
              "profile displays only masked CPF",
            );
          }
          if (path === "/account/payment-methods") {
            assert.equal(
              await evaluate(
                "document.querySelector('main').textContent.includes('4242')",
              ),
              true,
              "saved payment uses masked metadata",
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
      const pressEscape = async () => {
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
      };
      const setFixtureCookie = async (name, value) =>
        send("Network.setCookie", { name, value, url: origin.origin });
      const openCart = async () => {
        await evaluate(
          "document.querySelector('#store-cart-trigger').focus(); document.querySelector('#store-cart-trigger').click()",
        );
        await wait(
          "!!document.querySelector('[role=dialog]')",
          "cart drawer opens",
        );
      };
      await navigate("/products");
      await hydrated();
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Quantidade confirmada: 1')",
        "drawer loads the browser HTTP cart read",
      );
      await pause(220);
      const drawerShot = await send("Page.captureScreenshot", {
        format: "png",
      });
      writeFileSync(
        resolve(directory, "drawer-desktop.png"),
        Buffer.from(drawerShot.data, "base64"),
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=dialog]').contains(document.activeElement)",
        ),
        true,
        "cart traps focus",
      );
      assert.equal(
        await evaluate("location.pathname"),
        "/products",
        "opening cart preserves current route",
      );
      assert.deepEqual(
        await evaluate(
          "fetch('/api/cart',{cache:'no-store'}).then(async r=>({status:r.status,cache:r.headers.get('cache-control'),varyCookie:r.headers.get('vary').toLowerCase().split(',').map(v=>v.trim()).includes('cookie'),success:(await r.json()).success}))",
        ),
        {
          status: 200,
          cache: "private, no-store",
          varyCookie: true,
          success: true,
        },
        "cart HTTP response cannot be shared or cached",
      );
      await evaluate(
        "document.querySelector('[role=dialog] input[type=number]').focus()",
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
      // Quantity's native min may clamp: a malformed draft is checked before POST.
      await evaluate(
        "(()=>{const input=document.querySelector('[role=dialog] input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0'); input.dispatchEvent(new Event('input',{bubbles:true}));})()",
      );
      await evaluate(
        "document.querySelector('[role=dialog] input[type=number]').form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))",
      );
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Quantidade inválida')",
        "drawer rejects invalid quantity locally",
      );
      await pressEscape();
      await wait(
        "!document.querySelector('[role=dialog]') && document.activeElement.id==='store-cart-trigger'",
        "Escape closes drawer and restores its trigger focus",
      );
      await setFixtureCookie("ui-cart", "unauth");
      cartReadDelay = 800;
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Carregando carrinho')",
        "reopening starts with a fresh authenticated read",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=dialog]').textContent.includes('Kit de preparo')",
        ),
        false,
        "old owner cart never flashes while the new cookie is being checked",
      );
      cartReadDelay = 0;
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Entre para consultar')",
        "401 clears private cart content",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('[role=dialog]').textContent.includes('Kit de preparo')",
        ),
        false,
        "old cart values are absent after 401",
      );
      await pressEscape();
      await wait(
        "!document.querySelector('[role=dialog]')",
        "session prompt closes",
      );
      await setFixtureCookie("ui-cart", "error");
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Não foi possível carregar')",
        "read error has recovery",
      );
      await setFixtureCookie("ui-cart", "normal");
      await clickText("Tentar novamente");
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Quantidade confirmada: 1')",
        "manual read retry recovers",
      );
      await evaluate(
        "(()=>{const peer=new BroadcastChannel('guardian-auth'); peer.postMessage('identity-changed'); setTimeout(()=>peer.close(),100);})()",
      );
      await wait(
        "!document.querySelector('[role=dialog]')",
        "peer authentication changes close and discard the cart",
      );
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Quantidade confirmada: 1')",
        "cart can reload after peer invalidation",
      );
      await pressEscape();
      await wait(
        "!document.querySelector('[role=dialog]')",
        "recovered drawer closes",
      );
      await setFixtureCookie("ui-cart", "blocked");
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Estoque insuficiente')",
        "drawer explains insufficient stock",
      );
      assert.equal(
        await evaluate(
          "[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Revisar checkout')?.disabled",
        ),
        true,
        "blocked cart cannot enter checkout",
      );
      await pressEscape();
      await wait(
        "!document.querySelector('[role=dialog]')",
        "blocked drawer closes",
      );
      await setFixtureCookie("ui-cart", "empty");
      await openCart();
      await wait(
        "document.querySelector('[role=dialog]')?.textContent.includes('Seu carrinho está vazio')",
        "empty cart offers catalog recovery",
      );
      await pressEscape();
      await wait(
        "!document.querySelector('[role=dialog]')",
        "empty drawer closes",
      );
      await setFixtureCookie("ui-cart", "normal");
      await navigate("/cart");
      await wait(
        "location.pathname==='/products' && !!document.querySelector('[role=dialog]') && !location.search.includes('cart=open')",
        "legacy cart opens the drawer and consumes its URL intent",
      );
      await pressEscape();
      await navigate("/orders?page=2");
      assert.equal(
        await evaluate("location.pathname+location.search"),
        "/account/orders?page=2",
        "legacy order history preserves pagination",
      );
      await navigate(`/orders/${fixtureId}?page=2`);
      assert.equal(
        await evaluate("location.pathname+location.search"),
        `/account/orders/${fixtureId}?page=2`,
        "legacy order detail preserves pagination",
      );
      assert.equal(
        await evaluate(
          "!!document.querySelector('main a[href=\"/account/orders?page=2\"]')",
        ),
        true,
        "detail returns to the same history page",
      );
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
      await navigate("/account/payment-methods");
      await hydrated();
      await clickText("Adicionar cartão");
      await wait(
        "!!document.querySelector('form[aria-label=\"Adicionar cartão de simulação\"]')",
        "payment method form opens inline",
      );
      assert.equal(
        await evaluate(
          "document.querySelector('form[aria-label=\"Adicionar cartão de simulação\"] input[inputmode=numeric]')!==null",
        ),
        true,
        "payment entry uses numeric input affordance",
      );
      assert.equal(
        await evaluate(
          "document.querySelectorAll('form[aria-label=\"Adicionar cartão de simulação\"] input[type=month]').length",
        ),
        1,
        "card expiry uses one native month and year picker",
      );
      assert.equal(
        await evaluate(
          "(() => {const expiry=document.querySelector('input[type=month]');const cvv=document.querySelector('input[name=cvv]');return cvv?.type==='password' && cvv.inputMode==='numeric' && cvv.getBoundingClientRect().left >= expiry.getBoundingClientRect().right;})()",
        ),
        true,
        "CVV is concealed and sits to the right of the month-year input",
      );
      assert.equal(
        await evaluate(
          "(() => {const input=document.querySelector('input[type=month]');input.value='2099-12';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return input.checkValidity();})()",
        ),
        true,
        "native expiry accepts a future month",
      );
      await evaluate(
        "document.querySelector('form[aria-label=\"Adicionar cartão de simulação\"] input[inputmode=numeric]').focus()",
      );
      await send("Input.insertText", { text: "4111111111111111" });
      assert.equal(
        await evaluate("document.activeElement.value"),
        "4111 1111 1111 1111",
        "card number is grouped when pasted",
      );
      await evaluate("document.activeElement.select()");
      await send("Input.insertText", { text: "378282246310005" });
      assert.equal(
        await evaluate("document.activeElement.value"),
        "3782 822463 10005",
        "American Express uses its own grouping",
      );
      await evaluate("document.activeElement.setSelectionRange(5, 11)");
      await send("Input.insertText", { text: "123456" });
      assert.equal(
        await evaluate("document.activeElement.value"),
        "3782 123456 10005",
        "editing a selection preserves the other digits",
      );
      assert.equal(
        await evaluate("document.activeElement.selectionStart"),
        11,
        "mask preserves the caret during editing",
      );
      await clickText("Cancelar");
      await wait(
        "!document.querySelector('form[aria-label=\"Adicionar cartão de simulação\"]')",
        "cancel closes card entry",
      );
      await wait(
        "document.activeElement.tagName==='BUTTON' && document.activeElement.textContent.trim()==='Adicionar cartão'",
        "card form restores focus",
      );

      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate("/products");
      await hydrated();
      const openUserMenu = async () => {
        await wait(
          "!!document.querySelector('header button[aria-haspopup=menu]') && Object.keys(document.querySelector('header button[aria-haspopup=menu]')).some(k=>k.startsWith('__reactProps$'))",
          "account menu hydrates",
        );
        await evaluate(
          "document.querySelector('header button[aria-haspopup=menu]').focus()",
        );
        await send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
        });
        await send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
        });
        await wait(
          "!!document.querySelector('[role=menu]')",
          "user menu opens",
        );
      };
      adminNavigationDelay = 900;
      await openUserMenu();
      const curtainStarted = Date.now();
      const curtainOrigin = await evaluate("location.pathname");
      await evaluate(
        "document.querySelector('[role=menu] a[href=\"/admin\"]').click()",
      );
      await pause(200);
      assert.equal(
        await evaluate("location.pathname"),
        curtainOrigin,
        "destination navigation waits for the curtain to close",
      );
      assert.equal(
        await evaluate("document.querySelector('.gb-curtain')?.dataset.phase"),
        "entering",
        "source stays mounted during curtain entry",
      );
      await wait(
        "document.querySelector('.gb-curtain')?.dataset.phase==='covered'",
        "curtain covers while real route GET is pending",
      );
      assert.equal(
        await evaluate("!!document.querySelector('[inert] main')"),
        true,
        "covered route is not interactive",
      );
      await pause(600);
      assert.equal(
        await evaluate("document.querySelector('.gb-curtain')?.dataset.phase"),
        "covered",
        "brand remains fully visible before revealing a ready destination",
      );
      await wait(
        "location.pathname==='/admin' && document.querySelector('h1')?.textContent==='Dashboard' && !document.querySelector('.gb-curtain') && !document.querySelector('[inert]')",
        "resolved dashboard readiness releases the curtain",
      );
      assert.ok(
        Date.now() - curtainStarted >= 1700,
        "context transition uses the slower brand timing",
      );
      adminNavigationDelay = 0;
      await openUserMenu();
      await evaluate(
        "document.querySelector('[role=menu] a[href=\"/\"]').click()",
      );
      await wait(
        "location.pathname==='/' && !!document.querySelector('#home-products-title') && !document.querySelector('.gb-curtain')",
        "admin returns to resolved shop content",
      );

      await navigate("/products");
      await hydrated();
      adminNavigationDelay = 6200;
      await openUserMenu();
      await evaluate(
        "document.querySelector('[role=menu] a[href=\"/admin\"]').click()",
      );
      await wait(
        "!!document.querySelector('.gb-curtain')",
        "slow context navigation starts a curtain",
      );
      await wait(
        "!document.querySelector('.gb-curtain') && !document.querySelector('[inert]')",
        "watchdog reveals accessible fallback before an unresolved navigation",
      );
      assert.notEqual(
        await evaluate("document.querySelector('h1')?.textContent"),
        "Dashboard",
        "watchdog does not pretend pending content is ready",
      );
      await wait(
        "location.pathname==='/admin' && document.querySelector('h1')?.textContent==='Dashboard'",
        "original slow navigation completes without being repeated",
      );
      adminNavigationDelay = 0;

      // A request-time access change is a redirect, never a reason to keep masking.
      await navigate("/products");
      await hydrated();
      await setFixtureCookie("ui-access", "anonymous");
      await openUserMenu();
      await evaluate(
        "document.querySelector('[role=menu] a[href=\"/admin\"]').click()",
      );
      await wait(
        "location.pathname==='/login' && !document.querySelector('.gb-curtain') && !document.querySelector('[inert]')",
        "login redirect releases context motion",
      );
      await setFixtureCookie("ui-access", "admin");
      await send("Network.deleteCookies", {
        name: "__Host-guardian-session",
        url: origin.origin,
        path: "/",
      });
      for (const destination of [
        "/account/orders?page=2",
        "/checkout",
        "/admin/catalog?page=3",
      ]) {
        await navigate(destination);
        assert.equal(
          await evaluate("location.pathname"),
          "/login",
          "private route requests authentication",
        );
        assert.equal(
          await evaluate("new URL(location.href).searchParams.get('returnTo')"),
          destination,
          "forced login retains actual internal path and query",
        );
      }
      await send("Network.setCookie", {
        name: "__Host-guardian-session",
        value: "a".repeat(64),
        url: origin.origin,
        path: "/",
        secure: true,
        httpOnly: true,
      });
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await navigate("/products");
      await hydrated();
      await openUserMenu();
      await evaluate(
        "document.querySelector('[role=menu] a[href=\"/admin\"]').click()",
      );
      await wait(
        "location.pathname==='/admin' && document.querySelector('h1')?.textContent==='Dashboard'",
        "reduced motion keeps context navigation immediate",
      );
      assert.equal(
        await evaluate(
          "!document.querySelector('.gb-curtain') && !document.querySelector('[inert]')",
        ),
        true,
        "reduced motion never masks or interdicts the route",
      );
      await navigate("/sobre");
      await evaluate(
        "document.querySelector('footer a[href=\"/ajuda\"]').click()",
      );
      await wait(
        "location.pathname==='/ajuda' && document.querySelector('h1')?.textContent==='Como podemos ajudar?'",
        "footer link navigates with reduced motion",
      );
      await evaluate(
        "document.querySelector('footer a[href=\"/privacidade\"]').click()",
      );
      await wait(
        "location.pathname==='/privacidade' && document.querySelector('main')?.textContent.includes('Em elaboração')",
        "policy is reachable from the footer",
      );
      assert.equal(
        await evaluate(
          "getComputedStyle(document.documentElement,'::view-transition-new(root)').animationName==='none' || !document.getAnimations().some(animation=>animation.playState==='running')",
        ),
        true,
        "reduced motion does not leave a running page animation",
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
