import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/categories";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import type { AuditInput } from "@/lib/audit/input";
import { writeAuditEvent } from "@/lib/audit/server";
import { manageCatalogSchema } from "../schemas/manage-catalog";

export async function manageCatalog(input: unknown) {
  const parsed = manageCatalogSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    let failure: unknown;
    const result = await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success)
        return { success: false as const, code: "FORBIDDEN" as const };
      if (!(await reserveAbuseBudget(tx, auth.identity.id, "admin.catalog")))
        return { success: false as const, code: "RATE_LIMITED" as const };
      // Savepoint uses the same connection: reserve persists on business rollback.
      return tx
        .transaction(async (tx) => {
          if (!(await requireAuthenticatedAdmin(tx)).success)
            throw new Error("AUTHORIZATION_EXPIRED");
          const data = parsed.data;
          let eventType: AuditInput["eventType"];
          let targetType: AuditInput["targetType"];
          let targetId: string;
          if (data.operation === "create-category") {
            const [category] = await tx
              .insert(categories)
              .values({ name: data.name })
              .returning({ id: categories.id });
            targetId = category.id;
            targetType = "category";
            eventType = "admin.category.created";
          } else if (data.operation === "update-category") {
            const rows = await tx
              .update(categories)
              .set({
                name: data.name,
                revision: sql`${categories.revision} + 1`,
              })
              .where(
                and(
                  eq(categories.id, data.id),
                  eq(categories.revision, data.revision),
                ),
              )
              .returning({ id: categories.id });
            if (!rows.length)
              return { success: false as const, code: "CONFLICT" as const };
            targetId = data.id;
            targetType = "category";
            eventType = "admin.category.updated";
          } else {
            targetType = "product";
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
              targetId = product.id;
              eventType = "admin.product.created";
            } else {
              const [previous] = await tx
                .select({ published: products.isPublished })
                .from(products)
                .where(eq(products.id, data.id))
                .for("update");
              targetId = data.id;
              eventType =
                previous && previous.published !== data.isPublished
                  ? data.isPublished
                    ? "admin.product.published"
                    : "admin.product.unpublished"
                  : "admin.product.updated";
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
          await writeAuditEvent(tx, {
            eventType,
            outcome: "SUCCESS",
            actorUserId: auth.identity.id,
            targetType,
            targetId,
          });
          return { success: true as const };
        })
        .catch((error) => {
          failure = error;
          return null;
        });
    });
    if (result === null) throw failure;
    return result;
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
