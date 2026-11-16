import "server-only";
import { count } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { orders } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { users } from "@/db/schema/users";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

const tables = { products, categories, orders, users };
type RecordKind = keyof typeof tables;

export async function countAdminRecords<K extends RecordKind>(
  kinds: readonly K[],
) {
  return getDb().transaction(async (tx) => {
    const access = await requireAuthenticatedAdmin(tx);
    if (!access.success) return access;
    const totals = {} as Record<K, number>;
    for (const kind of kinds) {
      const table: PgTable = tables[kind];
      const [row] = await tx.select({ total: count() }).from(table);
      totals[kind] = row.total;
    }
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    return { success: true as const, totals };
  });
}
