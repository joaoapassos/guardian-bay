import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { listQuerySchema } from "../schemas/list-query";

export async function readAdminCatalog(input: unknown) {
  const query = listQuerySchema
    .pick({ page: true, query: true, category: true })
    .extend({
      publication: z
        .enum(["all", "published", "draft"])
        .optional()
        .default("all"),
    })
    .safeParse(input);
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
        availableQuantity: inventory.availableQuantity,
        inventoryRevision: inventory.revision,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(
        and(
          query.data.category
            ? eq(products.categoryId, query.data.category)
            : undefined,
          query.data.query
            ? ilike(
                products.name,
                `%${query.data.query.replace(/[\\%_]/g, "\\$&")}%`,
              )
            : undefined,
          query.data.publication === "all"
            ? undefined
            : eq(products.isPublished, query.data.publication === "published"),
        ),
      )
      .orderBy(asc(products.id))
      .limit(51)
      .offset((query.data.page - 1) * 50);
    if (!(await requireAuthenticatedAdmin(tx)).success) return null;
    return {
      query: query.data,
      categories: categoryRows,
      products: productRows.slice(0, 50),
      hasNext: productRows.length > 50,
      page: query.data.page,
    };
  });
}
