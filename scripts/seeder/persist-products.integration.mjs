import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import postgres from "postgres";
import { createProductWriter } from "./persist-products.mjs";
import { createProductFactory } from "./product-factory.mjs";

test("dedicated DB: batch atomicity, replay, name uniqueness and neutral images and exclusive seed lock", async () => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/guardian_bay_test");
  if (process.env.DATABASE_URL)
    assert.notEqual(new URL(process.env.DATABASE_URL).pathname, url.pathname);
  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  let writer;
  const runId = randomUUID(),
    failedRun = randomUUID();
  const [oldCategory] =
    await sql`SELECT id FROM categories WHERE name='Demonstração — Equipamentos' LIMIT 1`;
  const factory = createProductFactory(
    (await sql`SELECT name FROM products`).map((row) => row.name),
  );
  const make = () => ({ product: factory() });
  try {
    writer = await createProductWriter(url.toString());
    await assert.rejects(
      createProductWriter(url.toString()),
      /SEED_ALREADY_RUNNING/,
    );
    const rows = [make(1), make(2), make(3)];
    assert.equal((await writer.persist(rows, { runId, count: 3 })).length, 3);
    assert.equal(await writer.count(runId), 3);
    assert.deepEqual(await writer.persist(rows, { runId, count: 3 }), []);
    assert.equal(await writer.count(runId), 3);
    const inventory =
      await sql`SELECT i.available_quantity FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.seed_run_id=${runId}`;
    assert.equal(inventory.length, 3);
    assert.ok(
      inventory.every(
        (row) => row.available_quantity >= 0 && row.available_quantity <= 1000,
      ),
    );
    const repeatedName = make(5);
    repeatedName.product.name = rows[0].product.name;
    repeatedName.product.seedNameKey = rows[0].product.seedNameKey;
    assert.deepEqual(
      await writer.persist([repeatedName], { runId: failedRun, count: 3 }),
      [],
    );
    const valid = make(6),
      invalid = make(7);
    invalid.product.amount = 0;
    await assert.rejects(
      writer.persist([valid, invalid], { runId: failedRun, count: 3 }),
    );
    assert.equal(await writer.count(failedRun), 0);
    assert.equal(
      (
        await sql`SELECT id FROM products WHERE seed_run_id=${runId} AND media_id IS NOT NULL`
      ).length,
      0,
    );
  } finally {
    await writer?.close();
    await sql`DELETE FROM inventory WHERE product_id IN (SELECT id FROM products WHERE seed_run_id IN (${runId},${failedRun}))`;
    await sql`DELETE FROM products WHERE seed_run_id IN (${runId},${failedRun})`;
    if (!oldCategory)
      await sql`DELETE FROM categories c WHERE name='Demonstração — Equipamentos' AND NOT EXISTS(SELECT 1 FROM products p WHERE p.category_id=c.id)`;
    await sql.end();
  }
});
