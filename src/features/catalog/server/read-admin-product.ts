import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

export async function readAdminProduct(input: unknown) {
  const id = z.uuid().safeParse(input);
  if (!id.success)
    return { success: false as const, code: "NOT_FOUND" as const };
  return getDb().transaction(async (tx) => {
    const access = await requireAuthenticatedAdmin(tx);
    if (!access.success) return access;
    const [product] = await tx
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
      .where(eq(products.id, id.data))
      .limit(1);
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    return product
      ? { success: true as const, product }
      : { success: false as const, code: "NOT_FOUND" as const };
  });
}
