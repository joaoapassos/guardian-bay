import assert from "node:assert/strict";
import { test } from "node:test";
import {
  openPersonalData,
  sealPersonalData,
} from "../../src/lib/security/personal-data-core.mjs";

test("dados fictícios usam o mesmo formato autenticado do checkout", () => {
  const previousKeys = process.env.BUYER_DATA_KEYS;
  const previousId = process.env.BUYER_DATA_ACTIVE_KEY_ID;
  try {
    process.env.BUYER_DATA_ACTIVE_KEY_ID = "fixture";
    process.env.BUYER_DATA_KEYS = JSON.stringify({
      fixture: Buffer.alloc(32, 1).toString("base64"),
    });
    const envelope = sealPersonalData("52998224725", "order:fixture");
    assert.equal(openPersonalData(envelope, "order:fixture"), "52998224725");
    assert.throws(() => openPersonalData(envelope, "order:other"));
  } finally {
    if (previousKeys === undefined) delete process.env.BUYER_DATA_KEYS;
    else process.env.BUYER_DATA_KEYS = previousKeys;
    if (previousId === undefined) delete process.env.BUYER_DATA_ACTIVE_KEY_ID;
    else process.env.BUYER_DATA_ACTIVE_KEY_ID = previousId;
  }
});
