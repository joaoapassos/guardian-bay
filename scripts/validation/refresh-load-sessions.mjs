import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease } from "./scope.mjs";
import { openLabDb } from "./state.mjs";

const lease = labLease();
const path = join(labDirectory, "load-fixtures.json");
const data = JSON.parse(readFileSync(path, "utf8"));
assert.equal(data.runId, lease.runId);
assert.equal(data.users.length, 1000);
const sql = await openLabDb();
try {
  const owned =
    await sql`SELECT id FROM users WHERE id IN ${sql(data.users.map((u) => u.id))} AND email LIKE ${`load-%.${lease.runId}@lab.example.test`}`;
  assert.equal(owned.length, data.users.length);
  const [time] =
    await sql`SELECT clock_timestamp()+interval '8 hours' AS expiry`;
  const fresh = data.users.map((u) => ({
    id: u.id,
    token: randomBytes(32).toString("hex"),
  }));
  for (let offset = 0; offset < fresh.length; offset += 100) {
    const records = fresh.slice(offset, offset + 100).map((u) => ({
      token_hash: createHash("sha256").update(u.token).digest("hex"),
      user_id: u.id,
      expires_at: time.expiry,
    }));
    await sql`INSERT INTO sessions ${sql(records, "token_hash", "user_id", "expires_at")}`;
  }
  copyFileSync(
    path,
    join(labDirectory, `load-fixtures-before-${Date.now()}.json`),
  );
  writeFileSync(
    path,
    JSON.stringify({
      ...data,
      preparedAt: new Date().toISOString(),
      users: fresh,
    }),
    { mode: 0o600 },
  );
  console.info(
    "1000 owned synthetic sessions provisioned outside measurement; prior fixture preserved. Login and expiry behavior are not measured.",
  );
} finally {
  await sql.end();
}
