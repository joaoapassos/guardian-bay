import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const labDirectory = resolve(".vitest/epic12");
export const labOrigin = "https://127.0.0.1:3449";
export const backendOrigin = "http://127.0.0.1:3139";
export const databaseUrl =
  "postgresql://postgres@127.0.0.1:55442/guardian_bay_test";

export function assertScope(origin, database) {
  assert.equal(
    origin,
    labOrigin,
    "Only the dedicated local HTTPS origin is authorized",
  );
  assert.equal(
    database,
    databaseUrl,
    "Only the dedicated local test cluster is authorized",
  );
}

export function labLease() {
  assertScope(process.env.LAB_BASE_URL, process.env.TEST_DATABASE_URL);
  const lease = JSON.parse(
    readFileSync(resolve(labDirectory, "lease.json"), "utf8"),
  );
  assert.equal(lease.origin, labOrigin);
  assert.equal(lease.database, databaseUrl);
  assert.ok(/^[0-9a-f-]{36}$/.test(lease.runId));
  const age = Date.now() - Date.parse(lease.createdAt);
  assert.ok(
    Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000,
    "Laboratory lease expired",
  );
  return lease;
}
