import "server-only";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { products } from "@/db/schema/products";
import { priceDto } from "@/lib/money/price";
import { listQuerySchema } from "../schemas/list-query";

export async function listProducts(input: unknown) {
  const parsed = listQuerySchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const { page, limit, query, category, sort } = parsed.data;
  // LIKE metacharacters are literals, not client-selected wildcard queries.
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const ordering =
    sort === "price-asc"
      ? asc(products.amount)
      : sort === "price-desc"
        ? desc(products.amount)
        : asc(products.name);
  const publicCategories = await getDb()
    .selectDistinct({ id: categories.id, name: categories.name })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(eq(products.isPublished, true))
    .orderBy(asc(categories.name), asc(categories.id))
    .limit(100);
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
    .where(
      and(
        eq(products.isPublished, true),
        category ? eq(products.categoryId, category) : undefined,
        query ? ilike(products.name, `%${escaped}%`) : undefined,
      ),
    )
    .orderBy(ordering, asc(products.id))
    .limit(limit + 1)
    .offset((page - 1) * limit);
  return {
    success: true as const,
    page,
    limit,
    query,
    category,
    sort,
    categories: publicCategories,
    hasNext: rows.length > limit,
    products: rows.slice(0, limit).map(({ amount, currency, ...product }) => ({
      ...product,
      price: priceDto({ amount, currency }),
    })),
  };
}
