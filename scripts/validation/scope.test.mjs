import assert from "node:assert/strict";
import { test } from "node:test";
import { assertScope, databaseUrl, labOrigin } from "./scope.mjs";

test("laboratory rejects external targets and unrelated databases", () => {
  assert.doesNotThrow(() => assertScope(labOrigin, databaseUrl));
  for (const origin of [
    "https://example.com",
    "http://127.0.0.1:3449",
    `${labOrigin}/`,
    "https://localhost:3449",
    "https://127.0.0.1:3449@attacker.test",
  ])
    assert.throws(() => assertScope(origin, databaseUrl));
  assert.throws(() =>
    assertScope(labOrigin, databaseUrl.replace("55442", "5432")),
  );
  assert.throws(() =>
    assertScope(
      labOrigin,
      databaseUrl.replace("guardian_bay_test", "guardian_bay"),
    ),
  );
});
