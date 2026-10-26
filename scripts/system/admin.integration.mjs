import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { verify } from "argon2";
import postgres from "postgres";
import { provisionInitialAdmin } from "./provision-admin.mjs";

test("initial admin accepts exact technical password; existing email never changes role or hash", async () => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  assert.equal(url.pathname, "/guardian_bay_test");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  if (process.env.DATABASE_URL)
    assert.notEqual(new URL(process.env.DATABASE_URL).pathname, url.pathname);
  const sql = postgres(url.toString(), { max: 1 });
  const id = randomUUID();
  const email = `${id}@bootstrap.example.test`;
  try {
    assert.deepEqual(
      await provisionInitialAdmin(sql, { mode: "inspect", email }),
      { success: true, user: null },
    );
    assert.deepEqual(
      await provisionInitialAdmin(sql, {
        mode: "create",
        id,
        email,
        password: " x ",
      }),
      { success: true, id },
    );
    const [before] =
      await sql`SELECT password_hash,role FROM users WHERE id=${id}`;
    assert.equal(before.role, "admin");
    assert.equal(await verify(before.password_hash, " x "), true);
    assert.equal(await verify(before.password_hash, "x"), false);
    assert.deepEqual(
      await provisionInitialAdmin(sql, {
        mode: "create",
        id: randomUUID(),
        email,
        password: "another",
      }),
      { success: false, code: "EXISTS" },
    );
    const [after] = await sql`SELECT password_hash FROM users WHERE id=${id}`;
    assert.equal(after.password_hash, before.password_hash);
    await sql`UPDATE users SET role='customer' WHERE id=${id}`;
    assert.deepEqual(
      await provisionInitialAdmin(sql, {
        mode: "create",
        id,
        email,
        password: "new",
      }),
      { success: false, code: "EXISTS" },
    );
    assert.equal(
      (await sql`SELECT role FROM users WHERE id=${id}`)[0].role,
      "customer",
    );
    await assert.rejects(
      provisionInitialAdmin(sql, {
        mode: "create",
        id: randomUUID(),
        email: `${randomUUID()}@bootstrap.example.test`,
        password: "",
      }),
    );
  } finally {
    await sql`DELETE FROM users WHERE id=${id}`;
    await sql.end();
  }
});
