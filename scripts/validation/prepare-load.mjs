import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixtures } from "./http.mjs";
import { labDirectory } from "./scope.mjs";
import { openLabDb } from "./state.mjs";

const data = fixtures();
const path = join(labDirectory, "load-fixtures.json");
assert.ok(
  !existsSync(path),
  "Load fixtures already prepared; do not duplicate runs",
);
const sql = await openLabDb();
try {
  const [reference] =
    await sql`SELECT password_hash FROM users WHERE id=${data.users[0].id}`;
  const users = await sql.begin(async (tx) => {
    const records = [];
    for (let i = 0; i < 1000; i++) {
      const [user] =
        await tx`INSERT INTO users(email,password_hash) VALUES (${`load-${i}.${data.runId}@lab.example.test`},${reference.password_hash}) RETURNING id`;
      const token = randomBytes(32).toString("hex");
      await tx`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(token).digest("hex")},${user.id},clock_timestamp()+interval '8 hours')`;
      records.push({ id: user.id, token });
    }
    return records;
  });
  writeFileSync(
    path,
    JSON.stringify({
      runId: data.runId,
      productId: data.products[0].id,
      users,
    }),
    { mode: 0o600 },
  );
  console.info(
    "1000 synthetic load identities provisioned privately; login capacity is not measured by these sessions.",
  );
} finally {
  await sql.end();
}
