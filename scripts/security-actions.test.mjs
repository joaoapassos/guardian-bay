import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
      assert.equal(actions.length, 5);
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
        "Origin, forwarded spoof and body limit fail before hashing",
        async () => {
          for (const origin of [
            "",
            "null",
            "https://evil.test",
            "http://127.0.0.1:3108",
          ]) {
            for (const index of [0, 1, 2, 3, 4]) {
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
          for (const index of [0, 3, 4]) {
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
    } finally {
      if (server) {
        server.kill();
        await closed;
      }
      await client`DELETE FROM users WHERE email=${email}`;
      await client`DELETE FROM login_rate_limits WHERE key IN ('global',${keys[0]},${keys[1]})`;
      await client.end();
      assert.ok(directory.startsWith(join(root, ".vitest", "security-http-")));
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
