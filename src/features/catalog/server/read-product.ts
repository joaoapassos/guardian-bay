import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { priceDto } from "@/lib/money/price";
import { productImage } from "../images";

export async function readProduct(input: unknown) {
  const id = z.uuid().safeParse(input);
  if (!id.success) return null;
  const [row] = await getDb()
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      amount: products.amount,
      currency: products.currency,
      category: categories.name,
      imageKey: products.imageKey,
      stockQuantity: inventory.availableQuantity,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(and(eq(products.id, id.data), eq(products.isPublished, true)))
    .limit(1);
  if (!row) return null;
  const { amount, currency, imageKey, stockQuantity, ...product } = row;
  return {
    ...product,
    inStock: (stockQuantity ?? 0) > 0,
    price: priceDto({ amount, currency }),
    image: productImage(imageKey, product.name),
  };
}
