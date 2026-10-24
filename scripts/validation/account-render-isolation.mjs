import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { transport } from "./http.mjs";
import { labDirectory, labLease } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const lease = labLease();
const data = JSON.parse(
  readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
);
assert.equal(data.runId, lease.runId);
const sql = await openLabDb();
try {
  const users = data.users.slice(0, 2);
  for (const user of users) {
    const [row] =
      await sql`SELECT email FROM users WHERE id=${user.id} AND email LIKE ${`load-%.${lease.runId}@lab.example.test`}`;
    assert.ok(row);
    user.email = row.email;
  }
  // Period3 prevents each backend in an even round-robin topology seeing only
  // one owner, which a simple A/B schedule could accidentally do.
  for (let i = 0; i < 24; i++) {
    const ownIndex = i % 3 === 2 ? 1 : 0;
    const own = users[ownIndex];
    const other = users[1 - ownIndex];
    const response = await transport("/account", { token: own.token });
    assert.equal(response.status, 200);
    assert.ok(response.text.includes(own.email));
    assert.equal(response.text.includes(other.email), false);
    assert.equal(response.text.includes(own.token), false);
  }
  const hash = (token) => createHash("sha256").update(token).digest("hex");
  await sql`DELETE FROM sessions WHERE token_hash=${hash(users[0].token)} AND user_id=${users[0].id}`;
  assert.equal(
    (await transport("/account", { token: users[0].token })).status,
    307,
  );
  assert.equal(
    (await transport("/account", { token: users[1].token })).status,
    200,
  );
  await sql`UPDATE sessions SET created_at=clock_timestamp()-interval '1 hour',last_active_at=clock_timestamp()-interval '31 minutes' WHERE token_hash=${hash(users[1].token)} AND user_id=${users[1].id}`;
  assert.equal(
    (await transport("/account", { token: users[1].token })).status,
    307,
  );
  assert.equal((await transport("/account")).status, 307);
  await assertIntegrity(sql);
  writeFileSync(
    `docs/validation/epic13-account-render-isolation-${Date.now()}.json`,
    `${JSON.stringify({ runId: lease.runId, buildId: readFileSync(".next/BUILD_ID", "utf8").trim(), status: "PASS", ownedReads: 24, schedulePeriod: 3, revokedDenied: true, idleExpiredDenied: true, anonymousDenied: true, note: "Two owned test sessions revoked/aged after positive reads; re-provision fixtures before later load; no tokens/emails exported" }, null, 2)}\n`,
  );
  console.info(
    "24realRSCownership reads and cross-request revocation/idle/anonymous denial passed.",
  );
} finally {
  await sql.end();
}
