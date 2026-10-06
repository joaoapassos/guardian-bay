import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { manageCatalogSchema } from "../schemas/manage-catalog";

export async function manageCatalog(input: unknown) {
  const parsed = manageCatalogSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success)
        return { success: false as const, code: "FORBIDDEN" as const };
      const data = parsed.data;
      if (data.operation === "create-category") {
        await tx.insert(categories).values({ name: data.name });
      } else if (data.operation === "update-category") {
        const rows = await tx
          .update(categories)
          .set({ name: data.name, revision: sql`${categories.revision} + 1` })
          .where(
            and(
              eq(categories.id, data.id),
              eq(categories.revision, data.revision),
            ),
          )
          .returning({ id: categories.id });
        if (!rows.length)
          return { success: false as const, code: "CONFLICT" as const };
      } else {
        const fields = {
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          amount: data.amount,
          currency: data.currency,
          isPublished: data.isPublished,
          imageKey: data.imageKey,
        };
        if (data.operation === "create-product") {
          const [product] = await tx
            .insert(products)
            .values(fields)
            .returning({ id: products.id });
          await tx.insert(inventory).values({ productId: product.id });
        } else {
          const rows = await tx
            .update(products)
            .set({ ...fields, revision: sql`${products.revision} + 1` })
            .where(
              and(
                eq(products.id, data.id),
                eq(products.revision, data.revision),
              ),
            )
            .returning({ id: products.id });
          if (!rows.length)
            return { success: false as const, code: "CONFLICT" as const };
        }
      }
      // Expiration may occur while waiting for a product/category lock.
      if (!(await requireAuthenticatedAdmin(tx)).success)
        throw new Error("AUTHORIZATION_EXPIRED");
      return { success: true as const };
    });
  } catch {
    try {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "catalog",
          operation: parsed.data.operation,
          result: "OPERATION_FAILED",
          correlationId: randomUUID(),
        }),
      );
    } catch {
      /* Logging does not replace the operation result. */
    }
    return { success: false as const, code: "OPERATION_FAILED" as const };
  }
}
