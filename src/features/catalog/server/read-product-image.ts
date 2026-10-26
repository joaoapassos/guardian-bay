import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { productMedia } from "@/db/schema/product-media";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { loadMedia } from "./media-storage";

export async function readProductImage(input: unknown) {
  const id = z.uuid().safeParse(input);
  if (!id.success) return null;
  const [media] = await getDb()
    .select({
      key: productMedia.storageKey,
      owner: productMedia.uploadedBy,
      expires: productMedia.expiresAt,
    })
    .from(productMedia)
    .where(and(eq(productMedia.id, id.data), eq(productMedia.origin, "upload")))
    .limit(1);
  if (!media?.key) return null;
  const [published] = await getDb()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.mediaId, id.data), eq(products.isPublished, true)))
    .limit(1);
  if (!published) {
    const auth = await requireAuthenticatedAdmin();
    if (
      !auth.success ||
      (media.expires &&
        (media.owner !== auth.identity.id ||
          media.expires.getTime() <= Date.now()))
    )
      return null;
  }
  const bytes = await loadMedia(media.key);
  if (!published && !(await requireAuthenticatedAdmin()).success) return null;
  return { bytes, public: Boolean(published) };
}
