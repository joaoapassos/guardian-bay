import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";

// Public projection only; privileged operations re-read inside their transaction.
export async function readAvailability(input: unknown) {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return null;
  const [row] = await getDb()
    .select({ quantity: inventory.availableQuantity })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(and(eq(products.id, parsed.data), eq(products.isPublished, true)))
    .limit(1);
  return row ? { inStock: (row.quantity ?? 0) > 0 } : null;
}
