import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeedState } from "./checkpoint.mjs";
import { createProductFactory } from "./product-factory.mjs";
import { runProductSeed } from "./run-products.mjs";

test("factory creates1000 distinct valid products without images", () => {
  const factory = createProductFactory([]),
    names = new Set();
  for (let i = 0; i < 1000; i++) {
    const product = factory();
    assert.ok(!names.has(product.name));
    names.add(product.name);
    assert.ok(product.amount > 0);
    assert.ok(product.quantity >= 0 && product.quantity <= 1000);
    assert.equal(product.currency, "BRL");
    assert.equal(product.mediaId, undefined);
  }
});
test("seeder creates1000 in bounded batches and resumes from DB count", async () => {
  const state = createSeedState({ count: 1000 });
  let count = 0;
  const names = [];
  const writer = {
    count: async () => count,
    names: async () => names,
    persist: async (rows) => {
      assert.ok(rows.length <= 100);
      for (const row of rows) {
        assert.equal(row.media, undefined);
        names.push(row.product.name);
      }
      count += rows.length;
    },
  };
  const checkpoint = { save: async () => {} };
  assert.equal(
    (await runProductSeed({ state, writer, checkpoint, log: () => {} })).reason,
    "COMPLETE",
  );
  assert.equal(count, 1000);
  assert.equal(new Set(names).size, 1000);
  await runProductSeed({ state, writer, checkpoint, log: () => {} });
  assert.equal(count, 1000);
});
test("interruption keeps resumable run and does not write products", async () => {
  const state = createSeedState({ count: 200 });
  let saved = false;
  const result = await runProductSeed({
    state,
    writer: {
      count: async () => 0,
      names: async () => [],
      persist: async () => {
        throw Error("unexpected");
      },
    },
    checkpoint: {
      save: async () => {
        saved = true;
      },
    },
    signal: AbortSignal.abort(),
    log: () => {},
  });
  assert.equal(result.reason, "INTERRUPTED");
  assert.ok(saved);
});
