import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixtures } from "./http.mjs";
import { labDirectory } from "./scope.mjs";
import { openLabDb } from "./state.mjs";

const data = fixtures();
const path = join(labDirectory, "representative-fixtures.json");
assert.ok(
  !existsSync(path),
  "Preserve previous fixtures; use a new run for repetition",
);
const sql = await openLabDb();
try {
  const users = [];
  for (const user of data.users.filter((u) => ["a", "b"].includes(u.name))) {
    const token = randomBytes(32).toString("hex");
    await sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(token).digest("hex")},${user.id},clock_timestamp()+interval '8 hours')`;
    users.push({ id: user.id, token, cardId: user.cardId });
  }
  assert.equal(users.length, 2);
  const [before] =
    await sql`SELECT clock_timestamp() AS prepared_at, available_quantity FROM inventory WHERE product_id=${data.products[0].id}`;
  const buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
  writeFileSync(
    path,
    JSON.stringify({
      runId: data.runId,
      buildId,
      productId: data.products[0].id,
      users,
      before,
    }),
    { mode: 0o600 },
  );
  console.info(
    "Two private calibration sessions provisioned; login cost and 5000-user cardinality are not measured.",
  );
} finally {
  await sql.end();
}
