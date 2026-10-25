import "server-only";
import { and, asc, count, desc, eq, gt, gte, ilike, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { priceDto } from "@/lib/money/price";
import { productImage } from "../images";
import { publicListQuerySchema } from "../schemas/list-query";
import { readPublicCategories } from "./read-public-categories";

export async function listProducts(input: unknown) {
  const parsed = publicListQuerySchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const {
    page,
    limit,
    query,
    category,
    sort,
    minPrice,
    maxPrice,
    availability,
  } = parsed.data;
  // LIKE metacharacters are literals, not client-selected wildcard queries.
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const ordering =
    sort === "price-asc"
      ? asc(products.amount)
      : sort === "price-desc"
        ? desc(products.amount)
        : asc(products.name);
  const publicCategories = await readPublicCategories();
  const conditions = and(
    eq(products.isPublished, true),
    category ? eq(products.categoryId, category) : undefined,
    query ? ilike(products.name, `%${escaped}%`) : undefined,
    minPrice === undefined ? undefined : gte(products.amount, minPrice),
    maxPrice === undefined ? undefined : lte(products.amount, maxPrice),
    availability === "in-stock"
      ? gt(inventory.availableQuantity, 0)
      : undefined,
  );
  const [summary] = await getDb()
    .select({ total: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(conditions);
  const rows = await getDb()
    .select({
      id: products.id,
      name: products.name,
      amount: products.amount,
      currency: products.currency,
      category: categories.name,
      imageKey: products.imageKey,
      stockQuantity: inventory.availableQuantity,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(conditions)
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
    minPrice,
    maxPrice,
    availability,
    total: summary.total,
    categories: publicCategories,
    hasNext: rows.length > limit,
    products: rows
      .slice(0, limit)
      .map(({ amount, currency, imageKey, stockQuantity, ...product }) => ({
        ...product,
        inStock: (stockQuantity ?? 0) > 0,
        price: priceDto({ amount, currency }),
        image: productImage(imageKey, product.name),
      })),
  };
}
