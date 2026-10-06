import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { writeAuditEvent } from "@/lib/audit/server";
import { setInventorySchema } from "../schemas/set-inventory";

const expired = Symbol("authorization-expired");
export async function setInventoryQuantity(input: unknown) {
  const parsed = setInventorySchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success)
        return { success: false as const, code: "FORBIDDEN" as const };
      const { productId, quantity, revision } = parsed.data;
      const [product] = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, productId))
        .for("share");
      if (!product)
        return { success: false as const, code: "CONFLICT" as const };
      const changed = await tx
        .update(inventory)
        .set({
          availableQuantity: quantity,
          revision: sql`${inventory.revision} + 1`,
        })
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.revision, revision),
            sql`${inventory.revision} < 2147483647`,
          ),
        )
        .returning({ productId: inventory.productId });
      if (!(await requireAuthenticatedAdmin(tx)).success) throw expired;
      if (changed.length)
        await writeAuditEvent(tx, {
          eventType: "admin.inventory.updated",
          outcome: "SUCCESS",
          actorUserId: auth.identity.id,
          targetType: "inventory",
          targetId: productId,
        });
      return changed.length
        ? { success: true as const }
        : { success: false as const, code: "CONFLICT" as const };
    });
  } catch (error) {
    if (error === expired)
      return { success: false as const, code: "FORBIDDEN" as const };
    try {
      console.warn(
        JSON.stringify({
          operation: "inventory.set",
          event: "inventory",
          result: "OPERATION_FAILED",
          timestamp: new Date().toISOString(),
          correlationId: randomUUID(),
        }),
      );
    } catch {
      /* best effort */
    }
    throw new Error("Não foi possível atualizar o estoque.");
  }
}
