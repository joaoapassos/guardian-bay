import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
export async function readAdminCategories() {
  return getDb().transaction(async (tx) => {
    const access = await requireAuthenticatedAdmin(tx);
    if (!access.success) return access;
    const rows = await tx
      .select({
        id: categories.id,
        name: categories.name,
        revision: categories.revision,
      })
      .from(categories)
      .orderBy(asc(categories.name), asc(categories.id))
      .limit(101);
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    return {
      success: true as const,
      categories: rows.slice(0, 100),
      hasMore: rows.length > 100,
    };
  });
}
