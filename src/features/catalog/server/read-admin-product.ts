import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { inventory } from "@/db/schema/inventory";
import { productMedia } from "@/db/schema/product-media";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { mediaSelection } from "@/features/catalog/server/media-selection";
import { productImage } from "../images";

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
        media: mediaSelection,
        mediaId: products.mediaId,
        availableQuantity: inventory.availableQuantity,
        inventoryRevision: inventory.revision,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .leftJoin(productMedia, eq(productMedia.id, products.mediaId))
      .where(eq(products.id, id.data))
      .limit(1);
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    return product
      ? {
          success: true as const,
          product: (({ media, ...fields }) => ({
            ...fields,
            image: productImage(fields.imageKey, fields.name, media),
          }))(product),
        }
      : { success: false as const, code: "NOT_FOUND" as const };
  });
}
