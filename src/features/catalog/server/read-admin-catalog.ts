import "server-only";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { listQuerySchema } from "../schemas/list-query";

export async function readAdminCatalog(input: unknown) {
  const query = listQuerySchema.pick({ page: true }).safeParse(input);
  if (!query.success) return null;
  return getDb().transaction(async (tx) => {
    const auth = await requireAuthenticatedAdmin(tx);
    if (!auth.success) return null;
    const categoryRows = await tx
      .select({
        id: categories.id,
        name: categories.name,
        revision: categories.revision,
      })
      .from(categories)
      .orderBy(asc(categories.name), asc(categories.id))
      .limit(100);
    const productRows = await tx
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        categoryId: products.categoryId,
        amount: products.amount,
        currency: products.currency,
        isPublished: products.isPublished,
        revision: products.revision,
        imageKey: products.imageKey,
      })
      .from(products)
      .orderBy(asc(products.id))
      .limit(51)
      .offset((query.data.page - 1) * 50);
    if (!(await requireAuthenticatedAdmin(tx)).success) return null;
    return {
      categories: categoryRows,
      products: productRows.slice(0, 50),
      hasNext: productRows.length > 50,
      page: query.data.page,
    };
  });
}
