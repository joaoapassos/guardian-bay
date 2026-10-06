import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { argon2id, hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

test(
  "real Next.js Action transport against dedicated PostgreSQL",
  { timeout: 120000 },
  async (t) => {
    const value = process.env.TEST_DATABASE_URL;
    assert.ok(value, "TEST_DATABASE_URL is mandatory");
    const url = new URL(value);
    assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
    assert.equal(url.pathname, "/guardian_bay_test");
    if (process.env.DATABASE_URL)
      assert.notEqual(new URL(process.env.DATABASE_URL).pathname, url.pathname);
    const root = resolve(".");
    mkdirSync(join(root, ".vitest"), { recursive: true });
    const directory = mkdtempSync(join(root, ".vitest", "security-http-"));
    const client = postgres(value, { max: 1, onnotice: () => {} });
    const email = `${randomUUID()}@example.test`;
    const unknownEmail = `${randomUUID()}@example.test`;
    const password = "Security integration passphrase";
    const keys = [email, unknownEmail].map(
      (input) => `email:${createHash("sha256").update(input).digest("hex")}`,
    );
    let server;
    let closed;
    let catalogCategoryId;
    try {
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      const passwordHash = await hash(password, {
        type: argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
        hashLength: 32,
      });
      const [user] =
        await client`INSERT INTO users(email,password_hash) VALUES (${email},${passwordHash}) RETURNING id`;
      // Dedicated DB only: reset the shared test budget and our own fixture keys.
      await client`DELETE FROM login_rate_limits WHERE key IN ('global',${keys[0]},${keys[1]})`;
      for (const file of [
        "package.json",
        "tsconfig.json",
        "next.config.ts",
        "postcss.config.mjs",
      ])
        cpSync(join(root, file), join(directory, file));
      cpSync(join(root, "src"), join(directory, "src"), {
        recursive: true,
        filter: (path) =>
          !/\.(test|integration\.test)\.[cm]?[jt]sx?$/.test(path),
      });
      // Harness replaces composition only in an ignored isolated build, never app code.
      writeFileSync(
        join(directory, "src/app/layout.tsx"),
        'export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }\n',
      );
      writeFileSync(
        join(directory, "src/app/page.tsx"),
        `
import { redirect } from "next/navigation";
import { loginAction } from "@/features/auth/actions/login.action";
import { registerAction } from "@/features/auth/actions/register.action";
import { changePasswordAction } from "@/features/auth/actions/change-password.action";
import { logoutAction } from "@/features/auth/actions/logout.action";
import { readIdentityAction } from "@/features/auth/actions/read-identity.action";
import { getAuthenticatedIdentity } from "@/features/auth/server/session-cookie";
import { manageCatalogAction } from "@/features/catalog/actions/manage-catalog.action";
import { checkoutAction } from "@/features/orders/actions/checkout.action";
import { setInventoryQuantityAction } from "@/features/inventory/actions/set-inventory.action";
import { addToCartAction } from "@/features/cart/actions/add-to-cart.action";
import { updateCartItemAction, removeCartItemAction } from "@/features/cart/actions/cart-item.action";
async function stock(form:FormData) {"use server"; const input:Record<string,unknown>=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_"))); if("quantity" in input) input.quantity=Number(input.quantity);if("revision" in input) input.revision=Number(input.revision);const result=await setInventoryQuantityAction(input);redirect("/?result="+encodeURIComponent(JSON.stringify(result)));}
async function checkout(form:FormData) {"use server"; const input=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_"))); const result=await checkoutAction(input);redirect("/?result="+encodeURIComponent(JSON.stringify(result)));}
function cartInput(form: FormData) {
 const input: Record<string,unknown> = Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")));
 if("quantity" in input) input.quantity=Number(input.quantity);
 return input;
}
async function cartAdd(form:FormData) {"use server"; const result=await addToCartAction(cartInput(form));redirect("/?result="+encodeURIComponent(JSON.stringify(result)));}
async function cartUpdate(form:FormData) {"use server"; const result=await updateCartItemAction(cartInput(form));redirect("/?result="+encodeURIComponent(JSON.stringify(result)));}
async function cartRemove(form:FormData) {"use server"; const result=await removeCartItemAction(cartInput(form));redirect("/?result="+encodeURIComponent(JSON.stringify(result)));}
async function catalog(form: FormData) {
  "use server";
  const input: Record<string, unknown> = Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")));
  if ("amount" in input) input.amount = Number(input.amount);
  if ("revision" in input) input.revision = Number(input.revision);
  if ("isPublished" in input) input.isPublished = input.isPublished === "true";
  const result = await manageCatalogAction(input);
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
async function login(form: FormData) {
  "use server";
  const input: Record<string, unknown> = Object.fromEntries(form.entries());
  for (const key of Object.keys(input)) if (key.startsWith("$ACTION_")) delete input[key];
  const result = await loginAction(input);
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
async function logout() {
  "use server";
  const result = await logoutAction();
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
async function read(form: FormData) {
  "use server";
  const result = await readIdentityAction({userId: form.get("userId")});
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
async function register(form: FormData) {
  "use server";
  const input=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")));
  const result = await registerAction(input);
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
async function changePassword(form: FormData) {
  "use server";
  const input=Object.fromEntries([...form].filter(([key])=>!key.startsWith("$ACTION_")));
  const result = await changePasswordAction(input);
  redirect("/?result=" + encodeURIComponent(JSON.stringify(result)));
}
export default async function Probe() {
  const identity = await getAuthenticatedIdentity();
  return <main><p>{identity ? identity.id : "anonymous"}</p>
    <form action={login}><input name="email"/><input name="password"/></form>
    <form action={logout}/><form action={read}><input name="userId"/></form>
    <form action={register}><input name="email"/><input name="password"/></form>
    <form action={changePassword}><input name="currentPassword"/><input name="newPassword"/></form>
    <form action={catalog}/><form action={cartAdd}/><form action={cartUpdate}/><form action={cartRemove}/><form action={checkout}/><form action={stock}/>
  </main>;
}
`,
      );
      const env = {
        ...process.env,
        DATABASE_URL: value,
        NODE_ENV: "production",
      };
      const build = spawn(
        process.execPath,
        [join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
        { cwd: directory, env, stdio: "inherit" },
      );
      assert.equal(
        (await once(build, "close"))[0],
        0,
        "isolated Next build must pass",
      );
      server = spawn(
        process.execPath,
        [
          join(root, "node_modules/next/dist/bin/next"),
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3108",
        ],
        { cwd: directory, env, stdio: ["ignore", "pipe", "pipe"] },
      );
      closed = once(server, "close");
      let ready = false;
      server.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("Ready in")) ready = true;
      });
      server.stderr.on("data", () => {});
      for (let i = 0; i < 100 && !ready && server.exitCode === null; i++)
        await new Promise((done) => setTimeout(done, 100));
      assert.equal(ready, true);
      const base = "http://127.0.0.1:3108";
      const html = await (await fetch(base)).text();
      const actions = [...html.matchAll(/name="(\$ACTION_ID_[^"]+)"/g)].map(
        (match) => match[1],
      );
      assert.equal(actions.length, 11);
      const budget = async () =>
        (
          await client`SELECT attempts FROM login_rate_limits WHERE key='global'`
        )[0]?.attempts ?? 0;
      const post = (index, fields = {}, headers = {}, cookie) => {
        const form = new FormData();
        form.set(actions[index], "");
        for (const [key, data] of Object.entries(fields)) form.set(key, data);
        return fetch(base, {
          method: "POST",
          body: form,
          redirect: "manual",
          headers: {
            origin: "https://127.0.0.1:3108",
            ...headers,
            ...(cookie ? { cookie } : {}),
          },
        });
      };
      const result = (response) =>
        JSON.parse(
          new URL(response.headers.get("location"), base).searchParams.get(
            "result",
          ),
        );
      const credentials = { email, password };
      await t.test(
        "inventory Action: admin, strict contract, Origin/Host, body and revision",
        async () => {
          const [category] =
            await client`INSERT INTO categories(name) VALUES (${`Inventory HTTP ${randomUUID()}`}) RETURNING id`;
          const [product] =
            await client`INSERT INTO products(name,category_id,amount) VALUES ('Inventory HTTP',${category.id},1) RETURNING id`;
          await client`INSERT INTO inventory(product_id) VALUES (${product.id})`;
          const raw = randomBytes(32).toString("hex");
          const hashed = createHash("sha256").update(raw).digest("hex");
          const cookie = `__Host-guardian-session=${raw}`;
          await client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${hashed},${user.id},now()+interval '1 hour')`;
          const input = {
            productId: product.id,
            quantity: "10",
            revision: "1",
          };
          try {
            assert.deepEqual(result(await post(10, input)), {
              success: false,
              code: "FORBIDDEN",
            });
            assert.deepEqual(result(await post(10, input, {}, cookie)), {
              success: false,
              code: "FORBIDDEN",
            });
            await client`UPDATE users SET role='admin' WHERE id=${user.id}`;
            for (const origin of [
              "",
              "null",
              "https://attacker.test",
              "http://127.0.0.1:3108",
            ]) {
              const response = await post(10, input, { origin }, cookie);
              assert.ok(response.status >= 400);
              const text = await response.text();
              assert.ok(!text.includes(raw) && !text.includes(value));
            }
            const form = new FormData();
            form.set(actions[10], "");
            for (const [k, v] of Object.entries(input)) form.set(k, v);
            const encoded = new Request(base, { method: "POST", body: form });
            const body = Buffer.from(await encoded.arrayBuffer());
            const status = await new Promise((resolve, reject) => {
              const outgoing = httpRequest(
                base,
                {
                  method: "POST",
                  headers: {
                    host: "attacker.test",
                    origin: "https://127.0.0.1:3108",
                    cookie,
                    "content-type": encoded.headers.get("content-type"),
                    "content-length": body.length,
                  },
                },
                (response) => {
                  response.resume();
                  response.on("end", () => resolve(response.statusCode));
                },
              );
              outgoing.on("error", reject);
              outgoing.end(body);
            });
            assert.ok(status >= 400);
            assert.ok(
              (
                await post(
                  10,
                  { ...input, padding: "x".repeat(20000) },
                  {},
                  cookie,
                )
              ).status >= 400,
            );
            for (const key of [
              "userId",
              "role",
              "price",
              "currency",
              "status",
              "paymentStatus",
              "orderId",
              "stockDelta",
              "inventoryId",
              "availableQuantity",
              "inStock",
            ])
              assert.deepEqual(
                result(await post(10, { ...input, [key]: "1" }, {}, cookie)),
                { success: false, code: "INVALID_INPUT" },
              );
            for (const quantity of [
              "-1",
              "0.5",
              "NaN",
              "Infinity",
              "2147483648",
              "invalid",
            ])
              assert.deepEqual(
                result(await post(10, { ...input, quantity }, {}, cookie)),
                { success: false, code: "INVALID_INPUT" },
              );
            assert.deepEqual(result(await post(10, input, {}, cookie)), {
              success: true,
            });
            assert.deepEqual(result(await post(10, input, {}, cookie)), {
              success: false,
              code: "CONFLICT",
            });
            assert.deepEqual(
              (
                await client`SELECT available_quantity,revision FROM inventory WHERE product_id=${product.id}`
              )[0],
              { available_quantity: 10, revision: 2 },
            );
            await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
            assert.deepEqual(
              result(await post(10, { ...input, revision: "2" }, {}, cookie)),
              { success: false, code: "FORBIDDEN" },
            );
          } finally {
            await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
            await client`DELETE FROM sessions WHERE token_hash=${hashed}`;
            await client`DELETE FROM inventory WHERE product_id=${product.id}`;
            await client`DELETE FROM products WHERE id=${product.id}`;
            await client`DELETE FROM categories WHERE id=${category.id}`;
          }
        },
      );
      await t.test(
        "checkout Action: real HTTP, ownership, body, commercial authority and idempotency",
        async () => {
          const [category] =
            await client`INSERT INTO categories(name) VALUES (${`Checkout HTTP ${randomUUID()}`}) RETURNING id`;
          const [product] =
            await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('Checkout HTTP',${category.id},1099,true) RETURNING id`;
          await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},99)`;
          const raw = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(raw).digest("hex");
          const cookie = `__Host-guardian-session=${raw}`;
          const checkoutKey = randomUUID();
          await client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${tokenHash},${user.id},now()+interval '1 hour')`;
          try {
            assert.deepEqual(result(await post(9, { checkoutKey })), {
              success: false,
              code: "UNAUTHENTICATED",
            });
            for (const origin of [
              "",
              "null",
              "https://attacker.test",
              "http://127.0.0.1:3108",
            ]) {
              const response = await post(
                9,
                { checkoutKey },
                { origin },
                cookie,
              );
              assert.ok(response.status >= 400);
              const text = await response.text();
              assert.ok(!text.includes(raw) && !text.includes(value));
            }
            // fetch normalizes Host in this Node version; use a raw HTTP request.
            const hostForm = new FormData();
            hostForm.set(actions[9], "");
            hostForm.set("checkoutKey", checkoutKey);
            const encoded = new Request(base, {
              method: "POST",
              body: hostForm,
            });
            const encodedBody = Buffer.from(await encoded.arrayBuffer());
            const spoofedStatus = await new Promise((resolve, reject) => {
              const outgoing = httpRequest(
                base,
                {
                  method: "POST",
                  headers: {
                    host: "attacker.test",
                    origin: "https://127.0.0.1:3108",
                    "x-forwarded-host": "127.0.0.1:3108",
                    cookie,
                    "content-type": encoded.headers.get("content-type"),
                    "content-length": encodedBody.length,
                  },
                },
                (response) => {
                  response.resume();
                  response.on("end", () => resolve(response.statusCode));
                },
              );
              outgoing.on("error", reject);
              outgoing.end(encodedBody);
            });
            assert.ok(spoofedStatus >= 400);
            for (const key of [
              "availableQuantity",
              "inStock",
              "inventoryRevision",
              "userId",
              "items",
              "unitPrice",
              "amount",
              "subtotal",
              "total",
              "currency",
              "status",
              "paymentStatus",
              "role",
              "snapshot",
            ])
              assert.deepEqual(
                result(await post(9, { checkoutKey, [key]: "1" }, {}, cookie)),
                { success: false, code: "INVALID_INPUT" },
              );
            const oversized = await post(
              9,
              { checkoutKey, items: "x".repeat(20 * 1024) },
              {},
              cookie,
            );
            assert.ok(oversized.status >= 400);
            assert.deepEqual(
              result(await post(9, { checkoutKey: "' OR 1=1 --" }, {}, cookie)),
              { success: false, code: "INVALID_INPUT" },
            );
            assert.deepEqual(
              result(await post(9, { checkoutKey }, {}, cookie)),
              { success: false, code: "EMPTY_CART" },
            );
            await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${user.id},${product.id},2)`;
            await client`UPDATE products SET is_published=false WHERE id=${product.id}`;
            assert.deepEqual(
              result(await post(9, { checkoutKey }, {}, cookie)),
              { success: false, code: "UNAVAILABLE" },
            );
            await client`UPDATE products SET is_published=true WHERE id=${product.id}`;
            await client`UPDATE inventory SET available_quantity=1 WHERE product_id=${product.id}`;
            assert.deepEqual(
              result(await post(9, { checkoutKey }, {}, cookie)),
              { success: false, code: "OUT_OF_STOCK" },
            );
            assert.equal(
              (
                await client`SELECT count(*)::int n FROM orders WHERE user_id=${user.id}`
              )[0].n,
              0,
            );
            await client`UPDATE inventory SET available_quantity=2 WHERE product_id=${product.id}`;
            const pair = await Promise.all([
              post(9, { checkoutKey }, {}, cookie),
              post(9, { checkoutKey }, {}, cookie),
            ]);
            const paid = result(pair[0]);
            assert.deepEqual(paid, result(pair[1]));
            assert.equal(paid.status, "PAID");
            assert.equal(
              (
                await client`SELECT available_quantity FROM inventory WHERE product_id=${product.id}`
              )[0].available_quantity,
              0,
            );
            assert.equal(paid.success, true);
            assert.deepEqual(Object.keys(paid).sort(), [
              "orderId",
              "status",
              "success",
            ]);
            assert.equal(
              (
                await client`SELECT count(*)::int n FROM orders WHERE user_id=${user.id}`
              )[0].n,
              1,
            );
            await client`INSERT INTO cart_items(user_id,product_id) VALUES (${user.id},${product.id})`;
            assert.deepEqual(
              result(await post(9, { checkoutKey }, {}, cookie)),
              paid,
            );
            assert.equal(
              (
                await client`SELECT count(*)::int n FROM cart_items WHERE user_id=${user.id}`
              )[0].n,
              1,
            );
            assert.equal(
              (
                await client`SELECT available_quantity FROM inventory WHERE product_id=${product.id}`
              )[0].available_quantity,
              0,
            );
            await client`DELETE FROM sessions WHERE token_hash=${tokenHash}`;
            assert.deepEqual(
              result(await post(9, { checkoutKey }, {}, cookie)),
              { success: false, code: "UNAUTHENTICATED" },
            );
          } finally {
            await client`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id=${user.id})`;
            await client`DELETE FROM orders WHERE user_id=${user.id}`;
            await client`DELETE FROM cart_items WHERE user_id=${user.id} AND product_id=${product.id}`;
            await client`DELETE FROM sessions WHERE token_hash=${tokenHash}`;
            await client`DELETE FROM inventory WHERE product_id=${product.id}`;
            await client`DELETE FROM products WHERE id=${product.id}`;
            await client`DELETE FROM categories WHERE id=${category.id}`;
          }
        },
      );
      await t.test(
        "cart Actions: HTTP ownership, authority, Origin, body, replay and disclosure",
        async () => {
          const [category] =
            await client`INSERT INTO categories(name) VALUES (${`Cart HTTP ${randomUUID()}`}) RETURNING id`;
          const [product] =
            await client`INSERT INTO products(name,category_id,amount,is_published) VALUES ('HTTP cart',${category.id},1099,true) RETURNING id`;
          const [other] =
            await client`INSERT INTO users(email,password_hash) VALUES (${`${randomUUID()}@cart-http.example.test`},${passwordHash}) RETURNING id`;
          await client`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},99)`;
          const raw = randomBytes(32).toString("hex");
          const cookie = `__Host-guardian-session=${raw}`;
          await client`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(raw).digest("hex")},${user.id},now()+interval '1 hour')`;
          try {
            assert.deepEqual(
              result(await post(6, { productId: product.id, quantity: "1" })),
              { success: false, code: "UNAUTHENTICATED" },
            );
            for (const index of [6, 7, 8]) {
              const input = {
                productId: product.id,
                ...(index !== 8 ? { quantity: "1" } : {}),
              };
              for (const origin of [
                "",
                "null",
                "https://evil.test",
                "http://127.0.0.1:3108",
              ]) {
                const response = await post(index, input, { origin }, cookie);
                assert.ok(response.status >= 400);
                const body = await response.text();
                assert.ok(!body.includes(raw) && !body.includes(value));
              }
              const oversized = await post(
                index,
                { ...input, total: "x".repeat(20 * 1024) },
                {},
                cookie,
              );
              assert.ok(oversized.status >= 400);
              for (const key of [
                "availableQuantity",
                "inStock",
                "inventoryRevision",
                "userId",
                "cartId",
                "ownerId",
                "amount",
                "price",
                "unitPrice",
                "currency",
                "subtotal",
                "total",
                "role",
                "isPublished",
                "revision",
              ])
                assert.deepEqual(
                  result(
                    await post(
                      index,
                      { ...input, [key]: key === "currency" ? "USD" : "1" },
                      {},
                      cookie,
                    ),
                  ),
                  { success: false, code: "INVALID_INPUT" },
                );
            }
            await client`INSERT INTO cart_items(user_id,product_id,quantity) VALUES (${other.id},${product.id},9)`;
            assert.deepEqual(
              result(
                await post(
                  7,
                  { productId: product.id, quantity: "2" },
                  {},
                  cookie,
                ),
              ),
              { success: false, code: "CONFLICT" },
            );
            assert.deepEqual(
              result(await post(8, { productId: product.id }, {}, cookie)),
              { success: true },
            );
            assert.equal(
              (
                await client`SELECT quantity FROM cart_items WHERE user_id=${other.id}`
              )[0].quantity,
              9,
            );
            for (let i = 0; i < 2; i++)
              assert.deepEqual(
                result(
                  await post(
                    6,
                    { productId: product.id, quantity: "1" },
                    {},
                    cookie,
                  ),
                ),
                { success: true },
              );
            assert.equal(
              (
                await client`SELECT quantity FROM cart_items WHERE user_id=${user.id} AND product_id=${product.id}`
              )[0].quantity,
              2,
            );
            assert.deepEqual(
              result(
                await post(
                  7,
                  { productId: product.id, quantity: "3" },
                  {},
                  cookie,
                ),
              ),
              { success: true },
            );
            await client`UPDATE products SET is_published=false WHERE id=${product.id}`;
            assert.deepEqual(
              result(
                await post(
                  6,
                  { productId: product.id, quantity: "1" },
                  {},
                  cookie,
                ),
              ),
              { success: false, code: "UNAVAILABLE" },
            );
            for (let i = 0; i < 2; i++)
              assert.deepEqual(
                result(await post(8, { productId: product.id }, {}, cookie)),
                { success: true },
              );
            await client`DELETE FROM sessions WHERE token_hash=${createHash("sha256").update(raw).digest("hex")}`;
            assert.deepEqual(
              result(
                await post(
                  6,
                  { productId: product.id, quantity: "1" },
                  {},
                  cookie,
                ),
              ),
              { success: false, code: "UNAUTHENTICATED" },
            );
          } finally {
            await client`DELETE FROM cart_items WHERE product_id=${product.id}`;
            await client`DELETE FROM sessions WHERE token_hash=${createHash("sha256").update(raw).digest("hex")}`;
            await client`DELETE FROM inventory WHERE product_id=${product.id}`;
            await client`DELETE FROM products WHERE id=${product.id}`;
            await client`DELETE FROM categories WHERE id=${category.id}`;
            await client`DELETE FROM users WHERE id=${other.id}`;
          }
        },
      );
      await t.test(
        "Origin, forwarded spoof and body limit fail before hashing",
        async () => {
          for (const origin of [
            "",
            "null",
            "https://evil.test",
            "http://127.0.0.1:3108",
          ]) {
            for (const index of [0, 1, 2, 3, 4, 5]) {
              const response = await post(index, credentials, {
                origin,
                "x-forwarded-host": "evil.test",
                "x-forwarded-for": "127.0.0.1",
                "x-real-ip": "127.0.0.1",
                forwarded: "for=127.0.0.1",
              });
              assert.equal(response.status, 500);
              assert.equal(response.headers.get("set-cookie"), null);
              assert.doesNotMatch(
                await response.text(),
                /Requisição inválida|password_hash|DATABASE_URL/,
              );
            }
          }
          for (const index of [0, 3, 4, 5]) {
            const tooLarge = await post(index, {
              ...credentials,
              padding: "x".repeat(20000),
            });
            assert.equal(tooLarge.status, 500);
            assert.equal(tooLarge.headers.get("set-cookie"), null);
          }
          assert.equal(await budget(), 0);
          for (const [index, fields] of [
            [3, { ...credentials, role: "admin" }],
            [
              4,
              {
                currentPassword: password,
                newPassword: password,
                userId: user.id,
              },
            ],
          ]) {
            const response = await post(index, fields);
            assert.equal(response.status, 303);
            assert.deepEqual(result(response), {
              success: false,
              code: "INVALID_INPUT",
            });
            assert.equal(response.headers.get("set-cookie"), null);
          }
          assert.equal(await budget(), 0);
          const forged = await post(0, { ...credentials, role: "admin" });
          assert.equal(forged.status, 303);
          assert.deepEqual(result(forged), {
            success: false,
            message: "Credenciais inválidas.",
          });
          assert.equal(await budget(), 0);
        },
      );
      await t.test(
        "HTTP credential failures equivalent; cookie, ownership, rotation and replay",
        async () => {
          const incorrect = result(await post(0, { email, password: "wrong" }));
          const nonexistent = result(
            await post(0, { email: unknownEmail, password: "wrong" }),
          );
          assert.deepEqual(incorrect, nonexistent);
          const first = await post(0, credentials);
          assert.deepEqual(result(first), { success: true });
          const cookieHeader = first.headers.get("set-cookie");
          for (const pattern of [
            /^__Host-guardian-session=/,
            /HttpOnly/i,
            /Secure/i,
            /SameSite=lax/i,
            /Path=\//i,
            /Expires=/i,
          ])
            assert.match(cookieHeader, pattern);
          assert.doesNotMatch(cookieHeader, /Domain=/i);
          const cookie = cookieHeader.split(";")[0];
          const raw = cookie.split("=")[1];
          const [persisted] =
            await client`SELECT token_hash FROM sessions WHERE user_id=${user.id} AND token_hash=${createHash("sha256").update(raw).digest("hex")}`;
          assert.ok(persisted, "cookie must resolve to its persisted hash");
          assert.ok(
            persisted.token_hash !== raw,
            "raw token must never be persisted",
          );
          const page = await (
            await fetch(base, { headers: { cookie } })
          ).text();
          assert.ok(page.includes(user.id));
          assert.ok(!page.includes(raw) && !page.includes(passwordHash));
          assert.deepEqual(
            result(await post(2, { userId: user.id }, {}, cookie)),
            { success: true, identity: { id: user.id, email } },
          );
          assert.deepEqual(
            result(await post(2, { userId: randomUUID() }, {}, cookie)),
            { success: false, code: "NOT_FOUND" },
          );
          const second = await post(0, credentials, {}, cookie);
          const nextCookie = second.headers.get("set-cookie").split(";")[0];
          assert.ok(nextCookie !== cookie, "login must rotate the cookie");
          assert.ok(
            (
              await (await fetch(base, { headers: { cookie } })).text()
            ).includes("anonymous"),
          );
          const logout = await post(1, {}, {}, nextCookie);
          assert.deepEqual(result(logout), { success: true });
          assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
          assert.ok(
            (
              await (
                await fetch(base, { headers: { cookie: nextCookie } })
              ).text()
            ).includes("anonymous"),
          );
          assert.deepEqual(result(await post(1, {}, {}, nextCookie)), {
            success: true,
          });
        },
      );
      await t.test(
        "catalog Action authorization, mass assignment and public visibility over HTTP",
        async () => {
          const [category] =
            await client`INSERT INTO categories(name) VALUES (${`HTTP ${randomUUID()}`}) RETURNING id`;
          catalogCategoryId = category.id;
          const fields = {
            operation: "create-product",
            name: `HTTP public ${randomUUID()}`,
            description: "<script>window.catalogXss=true</script>",
            categoryId: category.id,
            amount: "1099",
            currency: "BRL",
            isPublished: "true",
            imageKey: "lock",
          };
          assert.deepEqual(result(await post(5, fields)), {
            success: false,
            code: "FORBIDDEN",
          });
          const customer = await post(0, credentials);
          assert.deepEqual(result(customer), { success: true });
          const customerCookie = customer.headers
            .get("set-cookie")
            .split(";")[0];
          assert.deepEqual(result(await post(5, fields, {}, customerCookie)), {
            success: false,
            code: "FORBIDDEN",
          });
          await client.begin(async (tx) => {
            await tx`SELECT id FROM users WHERE id=${user.id} FOR UPDATE`;
            await tx`UPDATE users SET role='admin' WHERE id=${user.id}`;
            await tx`DELETE FROM sessions WHERE user_id=${user.id}`;
          });
          const admin = await post(0, credentials);
          assert.deepEqual(result(admin), { success: true });
          const adminCookie = admin.headers.get("set-cookie").split(";")[0];
          for (const invalid of [
            { role: "admin" },
            { passwordHash: "forged" },
            { amount: "1.5" },
            { currency: "USD" },
            { price: "R$ 0,01" },
          ])
            assert.deepEqual(
              result(await post(5, { ...fields, ...invalid }, {}, adminCookie)),
              { success: false, code: "INVALID_INPUT" },
            );
          assert.deepEqual(result(await post(5, fields, {}, adminCookie)), {
            success: true,
          });
          const [product] =
            await client`SELECT id,revision FROM products WHERE category_id=${category.id}`;
          const detail = await fetch(`${base}/products/${product.id}`);
          const publicHtml = await detail.text();
          assert.ok(publicHtml.includes(fields.name));
          assert.ok(publicHtml.includes("&lt;script&gt;"));
          assert.doesNotMatch(
            publicHtml,
            /<script>window\.catalogXss|password_hash|passwordHash/,
          );
          assert.ok(!publicHtml.includes(passwordHash));
          const tampered = await (
            await fetch(`${base}/products?amount=1&currency=USD`)
          ).text();
          assert.match(tampered, /Filtros inválidos/);
          assert.deepEqual(
            result(
              await post(
                5,
                {
                  ...fields,
                  operation: "update-product",
                  id: product.id,
                  revision: "1",
                  isPublished: "false",
                },
                {},
                adminCookie,
              ),
            ),
            { success: true },
          );
          const hidden = await fetch(`${base}/products/${product.id}`);
          const missing = await fetch(`${base}/products/${randomUUID()}`);
          assert.equal(hidden.status, missing.status);
          assert.match(await hidden.text(), /Produto não encontrado/);
          assert.match(await missing.text(), /Produto não encontrado/);
          assert.ok(
            !(await (await fetch(`${base}/products`)).text()).includes(
              fields.name,
            ),
          );
          await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
          assert.deepEqual(
            result(
              await post(
                5,
                {
                  ...fields,
                  operation: "update-product",
                  id: product.id,
                  revision: "2",
                },
                {},
                adminCookie,
              ),
            ),
            { success: false, code: "FORBIDDEN" },
          );
        },
      );
      await t.test(
        "ECMSG-103: backoffice reads, role freshness, filters and immutable snapshot over HTTP",
        async () => {
          for (const path of [
            "/admin",
            "/admin/catalog",
            "/admin/orders",
            `/admin/orders/${randomUUID()}`,
          ]) {
            assert.equal((await fetch(base + path)).status, 404);
          }
          await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
          await client`DELETE FROM login_rate_limits WHERE key IN ('global',${keys[0]},${keys[1]})`;
          const login = await post(0, credentials);
          assert.deepEqual(result(login), { success: true });
          const cookie = login.headers.get("set-cookie").split(";")[0];
          for (const path of ["/admin", "/admin/catalog", "/admin/orders"])
            assert.equal(
              (await fetch(base + path, { headers: { cookie } })).status,
              404,
            );
          await client`UPDATE users SET role='admin' WHERE id=${user.id}`;
          const key = randomUUID();
          const [order] =
            await client`INSERT INTO orders(user_id,checkout_key,total_amount,status) VALUES (${user.id},${key},2198,'PAID') RETURNING id`;
          await client`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_amount,subtotal_amount) VALUES (${order.id},${randomUUID()},'HTTP immutable snapshot',2,1099,2198)`;
          try {
            for (const path of [
              "/admin",
              "/admin/catalog",
              "/admin/orders",
              `/admin/orders/${order.id}`,
            ]) {
              const response = await fetch(base + path, {
                headers: { cookie },
              });
              assert.equal(response.status, 200);
              const body = await response.text();
              assert.ok(
                !body.includes(key) &&
                  !body.includes(passwordHash) &&
                  !body.includes(cookie.split("=")[1]),
              );
              assert.doesNotMatch(
                body,
                /password_hash|checkoutKey|tokenHash|DATABASE_URL/,
              );
            }
            const detail = await (
              await fetch(`${base}/admin/orders/${order.id}`, {
                headers: { cookie },
              })
            ).text();
            assert.match(detail, /HTTP immutable snapshot/);
            assert.match(detail, /21,98/);
            for (const id of ["invalid", randomUUID()]) {
              const missing = await fetch(`${base}/admin/orders/${id}`, {
                headers: { cookie },
              });
              // Next.js documents 200 for notFound after streaming has started.
              assert.ok([200, 404].includes(missing.status));
              const body = await missing.text();
              assert.match(body, /This page could not be found/);
              assert.ok(
                !body.includes("HTTP immutable snapshot") &&
                  !body.includes(key),
              );
            }
            for (const query of [
              "status=SHIPPED",
              "sort=created_at%3Bdrop",
              "page=1001",
              "limit=51",
              "orderId=%27OR1%3D1",
              "userId=forged",
              `query=${"a".repeat(101)}`,
            ]) {
              const body = await (
                await fetch(`${base}/admin/orders?${query}`, {
                  headers: { cookie },
                })
              ).text();
              assert.match(body, /Filtros inválidos/);
              assert.ok(!body.includes("HTTP immutable snapshot"));
            }
            const filtered = await (
              await fetch(
                `${base}/admin/orders?status=PAYMENT_FAILED&orderId=${order.id}`,
                { headers: { cookie } },
              )
            ).text();
            assert.match(filtered, /Nenhum pedido/);
            await fetch(`${base}/admin/orders/${order.id}`, {
              method: "POST",
              headers: {
                cookie,
                origin: "https://127.0.0.1:3108",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                status: "PAYMENT_FAILED",
                total: 1,
                items: [],
              }),
            });
            assert.deepEqual(
              (
                await client`SELECT status,total_amount FROM orders WHERE id=${order.id}`
              )[0],
              { status: "PAID", total_amount: "2198" },
            );
            assert.equal(
              (
                await client`SELECT product_name FROM order_items WHERE order_id=${order.id}`
              )[0].product_name,
              "HTTP immutable snapshot",
            );
            await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
            for (const path of [
              "/admin",
              "/admin/orders",
              `/admin/orders/${order.id}`,
            ])
              assert.equal(
                (await fetch(base + path, { headers: { cookie } })).status,
                404,
              );
            await client`UPDATE users SET role='admin' WHERE id=${user.id}`;
            await client`DELETE FROM sessions WHERE user_id=${user.id}`;
            assert.equal(
              (await fetch(`${base}/admin/orders`, { headers: { cookie } }))
                .status,
              404,
            );
          } finally {
            await client`DELETE FROM order_items WHERE order_id=${order.id}`;
            await client`DELETE FROM orders WHERE id=${order.id}`;
            await client`UPDATE users SET role='customer' WHERE id=${user.id}`;
          }
        },
      );
    } finally {
      if (server) {
        server.kill();
        await closed;
      }
      if (catalogCategoryId) {
        await client`DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE category_id=${catalogCategoryId})`;
        await client`DELETE FROM products WHERE category_id=${catalogCategoryId}`;
        await client`DELETE FROM categories WHERE id=${catalogCategoryId}`;
      }
      await client`DELETE FROM users WHERE email=${email}`;
      await client`DELETE FROM login_rate_limits WHERE key IN ('global',${keys[0]},${keys[1]})`;
      await client.end();
      assert.ok(directory.startsWith(join(root, ".vitest", "security-http-")));
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
