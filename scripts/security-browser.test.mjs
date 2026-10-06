import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { verify } from "argon2";
import postgres from "postgres";

test("production HTTP, browser policies and identity workflows", async (t) => {
  const testDatabase = process.env.TEST_DATABASE_URL;
  if (testDatabase) {
    const url = new URL(testDatabase);
    assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
    assert.equal(url.pathname, "/guardian_bay_test");
    if (process.env.DATABASE_URL)
      assert.notEqual(new URL(process.env.DATABASE_URL).pathname, url.pathname);
  }
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
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(testDatabase ? { DATABASE_URL: testDatabase } : {}),
      },
    },
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
    const account = await fetch(`${base}/account`, { redirect: "manual" });
    assert.equal(account.status, 307);
    assert.equal(
      new URL(account.headers.get("location"), base).pathname,
      "/login",
    );
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
      const fonts = new Set(
        resources.filter((resource) => resource.endsWith(".woff2")),
      );
      for (const resource of new Set(resources)) {
        const response = await fetch(base + resource);
        assert.equal(response.status, 200, resource);
        if (resource.endsWith(".css")) {
          const css = await response.text();
          for (const match of css.matchAll(
            /url\(["']?([^\s)"']+\.woff2)["']?\)/g,
          ))
            fonts.add(new URL(match[1], base + resource).pathname);
        }
      }
      assert.ok(
        fonts.size > 0,
        "font resources must be referenced by HTML or CSS",
      );
      for (const font of fonts)
        assert.equal((await fetch(base + font)).status, 200, font);
    }
    await t.test(
      "Chromium runtime and CSP enforcement",
      { skip: !process.env.SECURITY_BROWSER_PATH },
      async (browserTest) => {
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
            // Only this isolated test profile accepts its ephemeral local TLS cert.
            "--ignore-certificate-errors",
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
          await browserTest.test(
            "real browser registration, login, account and password change over HTTPS",
            { skip: !testDatabase },
            async () => {
              const client = postgres(testDatabase, {
                max: 1,
                onnotice: () => {},
              });
              const email = `${randomUUID()}@example.test`;
              const unknown = `${randomUUID()}@example.test`;
              const password = "Browser integration passphrase 40";
              const newPassword = "New browser integration passphrase 40";
              const keys = [
                "global",
                ...[email, unknown].flatMap((value) =>
                  ["email", "reg", "pwd"].map(
                    (prefix) =>
                      `${prefix}:${createHash("sha256").update(value).digest("hex")}`,
                  ),
                ),
              ];
              const tlsDirectory = mkdtempSync(join(root, "identity-tls-"));
              let secure;
              let catalogCategoryId;
              try {
                const openssl =
                  process.env.SECURITY_OPENSSL_PATH ??
                  (process.platform === "win32"
                    ? "C:/Program Files/Git/usr/bin/openssl.exe"
                    : "openssl");
                const generated = spawnSync(
                  openssl,
                  [
                    "req",
                    "-x509",
                    "-newkey",
                    "rsa:2048",
                    "-nodes",
                    "-keyout",
                    join(tlsDirectory, "key.pem"),
                    "-out",
                    join(tlsDirectory, "cert.pem"),
                    "-days",
                    "1",
                    "-subj",
                    "/CN=localhost",
                    "-addext",
                    "subjectAltName=IP:127.0.0.1,DNS:localhost",
                  ],
                  {
                    stdio: "ignore",
                    windowsHide: true,
                    env: {
                      ...process.env,
                      ...(process.platform === "win32" &&
                      !process.env.SECURITY_OPENSSL_PATH
                        ? {
                            OPENSSL_CONF:
                              "C:/Program Files/Git/usr/ssl/openssl.cnf",
                          }
                        : {}),
                    },
                  },
                );
                assert.equal(
                  generated.status,
                  0,
                  "temporary TLS certificate generation must succeed",
                );
                // Test-only TLS terminator preserves public Host and strips forwarded authority.
                secure = createHttpsServer(
                  {
                    key: readFileSync(join(tlsDirectory, "key.pem")),
                    cert: readFileSync(join(tlsDirectory, "cert.pem")),
                  },
                  (request, response) => {
                    const headers = { ...request.headers };
                    for (const name of Object.keys(headers))
                      if (
                        name.startsWith("x-forwarded-") ||
                        name === "forwarded" ||
                        name === "x-real-ip"
                      )
                        delete headers[name];
                    const upstream = httpRequest(
                      {
                        hostname: "127.0.0.1",
                        port: 3107,
                        method: request.method,
                        path: request.url,
                        headers,
                      },
                      (result) => {
                        response.writeHead(result.statusCode, result.headers);
                        result.pipe(response);
                      },
                    );
                    upstream.on("error", () => {
                      response.writeHead(502);
                      response.end();
                    });
                    request.pipe(upstream);
                  },
                );
                secure.listen(3447, "127.0.0.1");
                await once(secure, "listening");
                await client`DELETE FROM login_rate_limits WHERE key IN ${client(keys)}`;
                const origin = "https://127.0.0.1:3447";
                const evaluate = async (expression) => {
                  const response = await call("Runtime.evaluate", {
                    expression,
                    returnByValue: true,
                    awaitPromise: true,
                  });
                  assert.ok(
                    !response.result?.exceptionDetails,
                    "browser expression must succeed",
                  );
                  return response.result?.result?.value;
                };
                const waitFor = async (expression, description) => {
                  for (let i = 0; i < 100; i++) {
                    if (await evaluate(expression)) return;
                    await new Promise((done) => setTimeout(done, 50));
                  }
                  const state = await evaluate(
                    "({path:location.pathname, message:document.querySelector('output')?.textContent, busy:document.querySelector('form')?.getAttribute('aria-busy'), invalid:[...document.querySelectorAll('[aria-invalid=true]')].map(input=>input.id)})",
                  );
                  assert.fail(`${description}: ${JSON.stringify(state)}`);
                };
                const navigate = async (path) => {
                  await call("Page.navigate", { url: origin + path });
                  await waitFor(
                    `location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!window.next`,
                    `navigate ${path}`,
                  );
                  await new Promise((done) => setTimeout(done, 200));
                };
                const submit = async (values) => {
                  for (const [id, value] of Object.entries(values)) {
                    await evaluate(
                      `document.getElementById(${JSON.stringify(id)}).focus(); document.getElementById(${JSON.stringify(id)}).select()`,
                    );
                    await call("Input.insertText", { text: value });
                  }
                  await evaluate(
                    "document.querySelector('form').requestSubmit()",
                  );
                };
                const output = (message) =>
                  waitFor(
                    `document.querySelector('output')?.textContent?.includes(${JSON.stringify(message)}) && document.querySelector('form').getAttribute('aria-busy') === 'false'`,
                    message,
                  );
                const cookie = async () => {
                  const response = await call("Network.getCookies", {
                    urls: [origin],
                  });
                  return response.result.cookies.find(
                    (item) => item.name === "__Host-guardian-session",
                  );
                };
                await call("Network.enable");
                await navigate("/register");
                await submit({ email: ` ${email.toUpperCase()} `, password });
                await output("Solicitação processada.");
                assert.equal(
                  await cookie(),
                  undefined,
                  "registration does not authenticate",
                );
                const [stored] =
                  await client`SELECT * FROM users WHERE email=${email}`;
                assert.ok(stored);
                assert.match(stored.password_hash, /^\$argon2id\$/);
                assert.ok(await verify(stored.password_hash, password));
                assert.ok(!Object.values(stored).includes(password));
                await submit({ email, password: newPassword });
                await output("Solicitação processada.");
                const [duplicate] =
                  await client`SELECT password_hash FROM users WHERE email=${email}`;
                assert.equal(
                  duplicate.password_hash,
                  stored.password_hash,
                  "duplicate must not reset password",
                );
                await submit({ email, password });
                await output("Tente novamente mais tarde.");
                await navigate("/login");
                assert.equal(
                  await evaluate(
                    "[...document.links].some(link => /esqueci/i.test(link.textContent))",
                  ),
                  false,
                );
                await submit({ email, password: "Incorrect passphrase" });
                await output("Credenciais inválidas.");
                const failure = await evaluate(
                  "document.querySelector('output').textContent",
                );
                await submit({ email: unknown, password });
                await output("Credenciais inválidas.");
                assert.equal(
                  await evaluate(
                    "document.querySelector('output').textContent",
                  ),
                  failure,
                );
                await submit({ email, password });
                await waitFor(
                  "location.pathname === '/account' && !!document.querySelector('#currentPassword')",
                  "successful login reaches own account",
                );
                const first = await cookie();
                assert.ok(first);
                assert.equal(first.httpOnly, true);
                assert.equal(first.secure, true);
                assert.equal(first.sameSite, "Lax");
                assert.equal(first.path, "/");
                assert.equal(
                  await evaluate(
                    "document.cookie.includes('guardian-session')",
                  ),
                  false,
                );
                const [session] =
                  await client`SELECT token_hash FROM sessions WHERE user_id=${stored.id}`;
                assert.equal(
                  session.token_hash,
                  createHash("sha256").update(first.value).digest("hex"),
                );
                assert.notEqual(session.token_hash, first.value);
                const html = await evaluate(
                  "document.documentElement.innerHTML",
                );
                for (const secret of [
                  stored.password_hash,
                  first.value,
                  session.token_hash,
                  stored.id,
                ])
                  assert.ok(
                    !html.includes(secret),
                    "account HTML/RSC must not expose privileged fields",
                  );
                assert.ok(
                  await evaluate(
                    `document.querySelector('dd').textContent === ${JSON.stringify(email)}`,
                  ),
                );
                await navigate("/login");
                await submit({ email, password });
                await waitFor(
                  "location.pathname === '/account' && !!document.querySelector('#currentPassword')",
                  "second login succeeds",
                );
                const rotated = await cookie();
                assert.notEqual(rotated.value, first.value);
                const [old] =
                  await client`SELECT count(*)::int AS count FROM sessions WHERE token_hash=${createHash("sha256").update(first.value).digest("hex")}`;
                assert.equal(old.count, 0);
                await submit({
                  currentPassword: "Incorrect passphrase",
                  newPassword,
                });
                await output("Não foi possível alterar a senha");
                await submit({ currentPassword: password, newPassword });
                await waitFor(
                  "location.pathname === '/login' && !!document.querySelector('#email')",
                  "password change requires fresh login",
                );
                assert.equal(await cookie(), undefined);
                const [revoked] =
                  await client`SELECT count(*)::int AS count FROM sessions WHERE user_id=${stored.id}`;
                assert.equal(revoked.count, 0);
                const [changed] =
                  await client`SELECT password_hash FROM users WHERE id=${stored.id}`;
                assert.ok(await verify(changed.password_hash, newPassword));
                assert.equal(
                  await verify(changed.password_hash, password),
                  false,
                );
                await submit({ email, password });
                await output("Credenciais inválidas.");
                await submit({ email, password: newPassword });
                await waitFor(
                  "location.pathname === '/account' && !!document.querySelector('#currentPassword')",
                  "new password works through UI",
                );
                await evaluate(
                  "[...document.querySelectorAll('button')].find(button=>button.textContent==='Sair').click()",
                );
                await waitFor(
                  "location.pathname === '/' && ![...document.querySelectorAll('button')].some(button=>button.textContent==='Sair')",
                  "logout returns visitor navigation",
                );
                assert.equal(await cookie(), undefined);
                await call("Network.setCookie", {
                  name: "__Host-guardian-session",
                  value: rotated.value,
                  url: origin,
                  path: "/",
                  httpOnly: true,
                  secure: true,
                  sameSite: "Lax",
                });
                await call("Page.navigate", { url: `${origin}/account` });
                await waitFor(
                  "location.pathname === '/login' && !!document.querySelector('#email')",
                  "revoked cookie replay does not authorize account",
                );
                await call("Network.deleteCookies", {
                  name: "__Host-guardian-session",
                  url: origin,
                });
                await submit({ email, password: newPassword });
                await output("Tente novamente mais tarde.");
                assert.equal(
                  await cookie(),
                  undefined,
                  "rate limit never authenticates",
                );
                for (const path of [
                  "/forgot-password",
                  "/reset-password",
                  "/api/reset-password",
                ])
                  assert.equal((await fetch(base + path)).status, 404);
                await client`DELETE FROM login_rate_limits WHERE key IN ${client(keys)}`;
                await navigate("/login");
                await submit({ email, password: newPassword });
                await waitFor(
                  "location.pathname === '/account'",
                  "customer login before administration",
                );
                const customerCookie = await cookie();
                assert.equal(
                  (
                    await fetch(`${base}/admin/catalog`, {
                      headers: {
                        cookie: `__Host-guardian-session=${customerCookie.value}`,
                      },
                    })
                  ).status,
                  404,
                );
                const [catalogUser] =
                  await client`SELECT id FROM users WHERE email=${email}`;
                await client.begin(async (tx) => {
                  await tx`SELECT id FROM users WHERE id=${catalogUser.id} FOR UPDATE`;
                  await tx`UPDATE users SET role='admin' WHERE id=${catalogUser.id}`;
                  await tx`DELETE FROM sessions WHERE user_id=${catalogUser.id}`;
                });
                await navigate("/login");
                await submit({ email, password: newPassword });
                await waitFor(
                  "location.pathname === '/account'",
                  "provisioned admin logs in again",
                );
                await navigate("/admin/catalog");
                const adminSubmit = async (label, values, feedback = true) => {
                  await evaluate(
                    `(() => { const form=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(label)}); for(const [name,value] of Object.entries(${JSON.stringify(values)})) { const input=form.elements.namedItem(name); if(input.type==='checkbox') input.checked=value; else input.value=value; input.dispatchEvent(new Event('change',{bubbles:true})); } form.requestSubmit(); })()`,
                  );
                  if (feedback)
                    await waitFor(
                      `(() => { const form=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(label)}); return form?.getAttribute('aria-busy')==='false' && form.querySelector('output')?.textContent?.includes('salv'); })()`,
                      `admin form ${label}`,
                    );
                };
                const categoryName = `Browser category ${randomUUID()}`;
                await adminSubmit("Criar categoria", { name: categoryName });
                const [category] =
                  await client`SELECT id FROM categories WHERE name=${categoryName}`;
                catalogCategoryId = category.id;
                await waitFor(
                  `!!document.querySelector('option[value="${category.id}"]')`,
                  "category available for product",
                );
                const catalogName = `Browser product ${randomUUID()} <img src=x onerror=window.cartXss=true>`;
                await adminSubmit("Criar produto", {
                  name: catalogName,
                  description: "<script>window.catalogXss=true</script>",
                  categoryId: category.id,
                  amount: "1099",
                  imageKey: "shield",
                  isPublished: true,
                });
                const [catalogProduct] =
                  await client`SELECT id,amount,image_key FROM products WHERE category_id=${category.id}`;
                assert.equal(catalogProduct.amount, 1099);
                assert.equal(catalogProduct.image_key, "shield");
                await navigate(`/products/${catalogProduct.id}`);
                assert.equal(
                  await evaluate(
                    "[...document.querySelectorAll('button')].some(b=>b.disabled && b.textContent==='Sem estoque')",
                  ),
                  true,
                );
                await navigate("/admin/catalog");
                const stockLabel = `Estoque de ${catalogName}`;
                await adminSubmit(stockLabel, { quantity: "2" }, false);
                await waitFor(
                  `(() => {const f=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(stockLabel)});return f?.elements.namedItem('quantity')?.defaultValue==='2' && f.getAttribute('aria-busy')==='false';})()`,
                  "admin stock refresh",
                );

                await navigate(`/products/${catalogProduct.id}`);
                assert.equal(
                  await evaluate(
                    "window.catalogXss === undefined && document.querySelector('main').textContent.includes('<script>window.catalogXss=true</script>')",
                  ),
                  true,
                );
                assert.equal(
                  await evaluate(
                    "!!document.querySelector('main svg[role=img][aria-label]')",
                  ),
                  true,
                );
                await evaluate(
                  "[...document.querySelectorAll('button')].find(b=>b.textContent==='Adicionar ao carrinho').click()",
                );
                await waitFor(
                  "[...document.querySelectorAll('output')].some(o=>o.textContent.includes('Produto adicionado ao carrinho.'))",
                  "add mutation finished",
                );
                await navigate("/cart");
                await waitFor(
                  "document.querySelector('main').textContent.includes('Subtotal: R$') && !!document.querySelector('input[name=quantity]')",
                  "persisted cart page",
                );
                assert.equal(
                  await evaluate(
                    "window.cartXss === undefined && document.querySelector('main').textContent.includes('<img src=x onerror=window.cartXss=true>')",
                  ),
                  true,
                );
                await evaluate(
                  "document.querySelector('input[name=quantity]').value='2'; document.querySelector('input[name=quantity]').form.requestSubmit()",
                );
                await waitFor(
                  "document.querySelector('main').textContent.includes('21,98') && document.querySelector('input[name=quantity]').defaultValue==='2'",
                  "quantity and total server refresh",
                );
                await evaluate(
                  "[...document.querySelectorAll('button')].find(b=>b.textContent==='Remover item').click()",
                );
                await waitFor(
                  "document.querySelector('main').textContent.includes('Seu carrinho está vazio')",
                  "remove real item",
                );
                await navigate("/products");
                await evaluate(
                  `(() => { const row=[...document.querySelectorAll('main li')].find(li=>li.textContent.includes(${JSON.stringify(catalogName)})); row.querySelector('button').click(); })()`,
                );
                await waitFor(
                  "[...document.querySelectorAll('output')].some(o=>o.textContent.includes('Produto adicionado ao carrinho.'))",
                  "add mutation finished",
                );
                await navigate(`/products/${catalogProduct.id}`);
                await evaluate(
                  "[...document.querySelectorAll('button')].find(b=>b.textContent==='Adicionar ao carrinho').click()",
                );
                await waitFor(
                  "[...document.querySelectorAll('output')].some(o=>o.textContent.includes('Produto adicionado ao carrinho.'))",
                  "add mutation finished",
                );
                await navigate("/admin/catalog");
                const editLabel = `Editar produto ${catalogName}`;
                await adminSubmit(editLabel, { amount: "1200" }, false);
                await waitFor(
                  `(() => { const form=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(editLabel)}); return form?.elements.namedItem('amount')?.defaultValue==='1200' && form.getAttribute('aria-busy')==='false'; })()`,
                  "updated product is rendered after save",
                );
                const [edited] =
                  await client`SELECT amount,revision FROM products WHERE id=${catalogProduct.id}`;
                assert.equal(edited.amount, 1200);
                assert.equal(edited.revision, 2);
                await navigate("/cart");
                await waitFor(
                  "document.querySelector('main').textContent.includes('24,00') && document.querySelector('input[name=quantity]').defaultValue==='2'",
                  "current catalogue price, no snapshot",
                );
                // ECMSG-77: real checkout, current prices, frozen history and cart finalization.
                await navigate("/checkout");
                await waitFor(
                  "!!document.querySelector('form[aria-label=\"Confirmar checkout\"]')",
                  "checkout preview ready",
                );
                await client`UPDATE products SET amount=1250 WHERE id=${catalogProduct.id}`;
                await evaluate(
                  "document.querySelector('form[aria-label=\"Confirmar checkout\"]').requestSubmit()",
                );
                await waitFor(
                  "/^\\/orders\\/[0-9a-f-]+$/.test(location.pathname) && document.querySelector('main').textContent.includes('Pagamento simulado aprovado')",
                  "checkout confirmation navigates to order",
                );
                const detailPath = await evaluate("location.pathname");
                const [snapshotOrder] =
                  await client`SELECT id,total_amount FROM orders WHERE user_id=${catalogUser.id}`;
                assert.equal(snapshotOrder.total_amount, "2500");
                assert.equal(
                  (
                    await client`SELECT count(*)::int n FROM cart_items WHERE user_id=${catalogUser.id}`
                  )[0].n,
                  0,
                );
                assert.equal(
                  (
                    await client`SELECT available_quantity FROM inventory WHERE product_id=${catalogProduct.id}`
                  )[0].available_quantity,
                  0,
                );
                await navigate(`/products/${catalogProduct.id}`);
                assert.equal(
                  await evaluate(
                    "[...document.querySelectorAll('button')].some(b=>b.disabled && b.textContent==='Sem estoque')",
                  ),
                  true,
                );
                await client`UPDATE products SET name='Later browser name',amount=9999,is_published=false WHERE id=${catalogProduct.id}`;
                await navigate(detailPath);
                await waitFor(
                  "document.querySelector('main').textContent.includes('25,00')",
                  "frozen snapshot remains after catalog change",
                );
                assert.equal(
                  await evaluate(
                    `document.querySelector('main').textContent.includes(${JSON.stringify(catalogName)}) && window.cartXss===undefined`,
                  ),
                  true,
                );
                await navigate("/orders");
                await waitFor(
                  "document.querySelector('main').textContent.includes('25,00')",
                  "private order history",
                );
                await client`UPDATE products SET name=${catalogName},amount=1200,is_published=true WHERE id=${catalogProduct.id}`;
                await navigate("/admin/catalog");
                await adminSubmit(stockLabel, { quantity: "2" }, false);
                await waitFor(
                  `(() => {const f=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(stockLabel)});return f?.elements.namedItem('quantity')?.defaultValue==='2' && f.getAttribute('aria-busy')==='false';})()`,
                  "restock after purchase",
                );

                await navigate(`/products/${catalogProduct.id}`);
                await evaluate(
                  "[...document.querySelectorAll('button')].find(b=>b.textContent==='Adicionar ao carrinho').click()",
                );
                await waitFor(
                  "[...document.querySelectorAll('output')].some(o=>o.textContent.includes('Produto adicionado ao carrinho.'))",
                  "new cart after paid order",
                );
                await navigate("/cart");
                await evaluate(
                  "document.querySelector('input[name=quantity]').value='2'; document.querySelector('input[name=quantity]').form.requestSubmit()",
                );
                await waitFor(
                  "document.querySelector('input[name=quantity]').defaultValue==='2'",
                  "new cart quantity restored for depublication flow",
                );
                await navigate("/checkout");
                await waitFor(
                  "!!document.querySelector('form[aria-label=\"Confirmar checkout\"]')",
                  "second checkout preview",
                );
                await client`UPDATE products SET amount=1000000 WHERE id=${catalogProduct.id}`;
                await evaluate(
                  "document.querySelector('form[aria-label=\"Confirmar checkout\"]').requestSubmit()",
                );
                await waitFor(
                  "location.pathname.startsWith('/orders/') && document.querySelector('main').textContent.includes('Pagamento simulado recusado')",
                  "simulated decline feedback",
                );
                assert.equal(
                  (
                    await client`SELECT quantity FROM cart_items WHERE user_id=${catalogUser.id}`
                  )[0].quantity,
                  2,
                );
                await client`UPDATE products SET amount=1200 WHERE id=${catalogProduct.id}`;
                await navigate("/admin/catalog");
                await adminSubmit(editLabel, { isPublished: false }, false);
                await waitFor(
                  "!!document.querySelector('[role=alertdialog]')",
                  "Radix depublication dialog",
                );
                assert.equal(
                  await evaluate("document.activeElement.textContent"),
                  "Cancelar",
                );
                await evaluate(
                  "document.querySelector('[role=alertdialog] button').click()",
                );
                await waitFor(
                  "!document.querySelector('[role=alertdialog]')",
                  "cancel closes dialog",
                );
                assert.equal(
                  await evaluate("document.activeElement.textContent"),
                  "Salvar produto",
                );

                assert.equal(
                  (
                    await client`SELECT is_published FROM products WHERE id=${catalogProduct.id}`
                  )[0].is_published,
                  true,
                );
                await adminSubmit(editLabel, { isPublished: false }, false);
                await waitFor(
                  "!!document.querySelector('[role=alertdialog]')",
                  "second Radix depublication dialog",
                );
                await evaluate(
                  "[...document.querySelectorAll('[role=alertdialog] button')].find(b=>b.textContent==='Confirmar despublicação').click()",
                );

                await waitFor(
                  `(() => { const form=[...document.forms].find(f=>f.getAttribute('aria-label')===${JSON.stringify(editLabel)}); return form?.elements.namedItem('isPublished')?.defaultChecked===false && form.getAttribute('aria-busy')==='false'; })()`,
                  "depublication is rendered after confirmation",
                );
                assert.equal(
                  (
                    await client`SELECT is_published FROM products WHERE id=${catalogProduct.id}`
                  )[0].is_published,
                  false,
                );
                await navigate("/cart");
                await waitFor(
                  "document.querySelector('main').textContent.includes('Produto indisponível') && document.querySelector('input[name=quantity]').disabled",
                  "unpublished item remains visible",
                );
                assert.ok(
                  await evaluate(
                    "document.querySelector('main').textContent.includes('0,00')",
                  ),
                );
                assert.equal(
                  (
                    await client`SELECT quantity FROM cart_items WHERE user_id=${catalogUser.id} AND product_id=${catalogProduct.id}`
                  )[0].quantity,
                  2,
                );
                await evaluate(
                  "[...document.querySelectorAll('button')].find(b=>b.textContent==='Remover item').click()",
                );
                await waitFor(
                  "document.querySelector('main').textContent.includes('Seu carrinho está vazio')",
                  "unavailable removal remains possible",
                );
                assert.equal(
                  (
                    await client`SELECT count(*)::int AS count FROM cart_items WHERE user_id=${catalogUser.id}`
                  )[0].count,
                  0,
                );
                await navigate(`/products/${catalogProduct.id}`);
                await waitFor(
                  "document.querySelector('main')?.textContent.includes('Produto não encontrado')",
                  "depublication immediately reflected",
                );
                assert.equal(
                  exceptions.length,
                  0,
                  "identity workflows must not throw in browser",
                );
                assert.equal(
                  consoleErrors.length,
                  0,
                  "identity workflows must not have hydration errors",
                );
              } finally {
                await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email=${email}))`;
                await client`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email=${email})`;
                if (catalogCategoryId) {
                  await client`DELETE FROM cart_items WHERE product_id IN (SELECT id FROM products WHERE category_id=${catalogCategoryId})`;
                  await client`DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE category_id=${catalogCategoryId})`;
                  await client`DELETE FROM products WHERE category_id=${catalogCategoryId}`;
                  await client`DELETE FROM categories WHERE id=${catalogCategoryId}`;
                }
                if (secure) {
                  secure.closeAllConnections();
                  await new Promise((done) => secure.close(done));
                }
                await client`DELETE FROM users WHERE email=${email}`;
                await client`DELETE FROM login_rate_limits WHERE key IN ${client(keys)}`;
                await client.end();
                assert.ok(tlsDirectory.startsWith(join(root, "identity-tls-")));
                rmSync(tlsDirectory, { recursive: true, force: true });
              }
            },
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
