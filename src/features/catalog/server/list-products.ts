import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { products } from "@/db/schema/products";
import { priceDto } from "@/lib/money/price";
import { listQuerySchema } from "../schemas/list-query";

export async function listProducts(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const { page, limit } = parsed.data;
  const rows = await getDb()
    .select({
      id: products.id,
      name: products.name,
      amount: products.amount,
      currency: products.currency,
      category: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isPublished, true))
    .orderBy(asc(products.id))
    .limit(limit + 1)
    .offset((page - 1) * limit);
  return {
    success: true as const,
    page,
    limit,
    hasNext: rows.length > limit,
    products: rows.slice(0, limit).map(({ amount, currency, ...product }) => ({
      ...product,
      price: priceDto({ amount, currency }),
    })),
  };
}
