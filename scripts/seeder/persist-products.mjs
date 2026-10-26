import postgres from "postgres";
import { seedNameKey, seedProductSchema } from "./product-factory.mjs";

export async function createProductWriter(url) {
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 0,
    max_lifetime: 0,
    onnotice: () => {},
  });
  try {
    const [lock] =
      await sql`SELECT pg_try_advisory_lock(hashtext('guardian-bay:product-seeder')) AS acquired`;
    if (!lock.acquired) throw new Error("SEED_ALREADY_RUNNING");
  } catch (error) {
    await sql.end();
    throw error;
  }
  return {
    async names() {
      return (await sql`SELECT name FROM products`).map((row) => row.name);
    },
    async count(runId) {
      return Number(
        (
          await sql`SELECT count(*) n FROM products WHERE seed_run_id=${runId}`
        )[0].n,
      );
    },
    async persist(rows, { runId, count }) {
      if (
        rows.length > 100 ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 1000
      )
        throw new Error("INVALID_BATCH");
      return sql.begin(async (tx) => {
        let created = Number(
          (
            await tx`SELECT count(*) n FROM products WHERE seed_run_id=${runId}`
          )[0].n,
        );
        const names = new Set(
          (await tx`SELECT name FROM products`).map((row) =>
            seedNameKey(row.name),
          ),
        );
        let category;
        const accepted = [];
        for (const row of rows) {
          const product = seedProductSchema.parse(row.product);
          if (created >= count || names.has(product.seedNameKey)) continue;
          if (!category) {
            [category] =
              await tx`SELECT id FROM categories WHERE name='Demonstração — Equipamentos' ORDER BY id LIMIT 1`;
            if (!category)
              [category] =
                await tx`INSERT INTO categories(name) VALUES ('Demonstração — Equipamentos') RETURNING id`;
          }
          await tx`INSERT INTO products ${tx({ id: product.id, name: product.name, description: product.description, category_id: category.id, amount: product.amount, currency: product.currency, is_published: true, seed_run_id: runId, seed_name_key: product.seedNameKey })}`;
          await tx`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},${product.quantity})`;
          names.add(product.seedNameKey);
          created++;
          accepted.push(product.id);
        }
        return accepted;
      });
    },
    async close() {
      try {
        await sql`SELECT pg_advisory_unlock(hashtext('guardian-bay:product-seeder'))`;
      } finally {
        await sql.end();
      }
    },
  };
}
