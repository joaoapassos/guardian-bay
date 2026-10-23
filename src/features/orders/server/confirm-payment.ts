import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { inventory } from "@/db/schema/inventory";
import { orderItems } from "@/db/schema/order-items";
import { orderPayments } from "@/db/schema/order-payments";
import { orders } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import { writeAuditEvent } from "@/lib/audit/server";
import { confirmPaymentSchema } from "../schemas/confirm-payment";
import { simulatePayment } from "../simulated-payment";
import { withPaymentSession } from "./payment-session";

export async function confirmPayment(input: unknown) {
  const parsed = confirmPaymentSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const result = await withPaymentSession(async (tx, userId, assertSession) => {
    // Identity lock serializes all mutations by this owner, including checkout.
    const [candidate] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, parsed.data.orderId), eq(orders.userId, userId)))
      .limit(1);
    if (!candidate)
      return { success: false as const, code: "NOT_FOUND" as const };
    if (candidate.status !== "PENDING_PAYMENT")
      return { success: true as const, status: candidate.status };
    if (!(await reserveAbuseBudget(tx, userId, "payment.confirm")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    return tx
      .transaction(async (business) => {
        const [order] = await business
          .select({
            id: orders.id,
            total: orders.totalAmount,
            status: orders.status,
          })
          .from(orders)
          .where(and(eq(orders.id, candidate.id), eq(orders.userId, userId)))
          .for("update");
        const [payment] = await business
          .select()
          .from(orderPayments)
          .where(eq(orderPayments.orderId, order.id))
          .for("update");
        if (!payment || payment.status !== "PENDING")
          return { success: false as const, code: "CONFLICT" as const };
        const clock = async () =>
          (
            await business
              .select({
                expired: sql<boolean>`${orderPayments.expiresAt} <= clock_timestamp()`,
                ready: sql<boolean>`${orderPayments.approvableAt} <= clock_timestamp()`,
              })
              .from(orderPayments)
              .where(eq(orderPayments.id, payment.id))
          )[0];
        let time = await clock();
        await assertSession();
        if (!time.expired && !time.ready)
          return { success: false as const, code: "NOT_READY" as const };
        let approved = false;
        if (
          !time.expired &&
          simulatePayment({
            status: order.status,
            totalAmount: order.total,
          }) === "PAID"
        ) {
          const items = await business
            .select({
              productId: orderItems.productId,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id))
            .orderBy(orderItems.productId)
            .limit(101);
          if (!items.length || items.length > 100)
            throw new Error("Invalid snapshot");
          const ids = items.map((item) => item.productId);
          const current = await business
            .select({ id: products.id, published: products.isPublished })
            .from(products)
            .where(inArray(products.id, ids))
            .orderBy(products.id)
            .for("share");
          const stocks = await business
            .select({
              id: inventory.productId,
              quantity: inventory.availableQuantity,
              revision: inventory.revision,
            })
            .from(inventory)
            .where(inArray(inventory.productId, ids))
            .orderBy(inventory.productId)
            .for("update");
          time = await clock();
          await assertSession();
          approved =
            !time.expired &&
            current.length === items.length &&
            current.every((p) => p.published) &&
            items.every((item) =>
              stocks.some(
                (stock) =>
                  stock.id === item.productId &&
                  stock.quantity >= item.quantity &&
                  stock.revision < 2147483647,
              ),
            );
          if (approved) {
            for (const item of items) {
              const changed = await business
                .update(inventory)
                .set({
                  availableQuantity: sql`${inventory.availableQuantity} - ${item.quantity}`,
                  revision: sql`${inventory.revision} + 1`,
                })
                .where(
                  and(
                    eq(inventory.productId, item.productId),
                    sql`${inventory.availableQuantity} >= ${item.quantity}`,
                    sql`${inventory.revision} < 2147483647`,
                  ),
                )
                .returning({ id: inventory.productId });
              if (changed.length !== 1) throw new Error("Inventory conflict");
            }
          }
        }
        // Recheck even after lock waits; time crossing expiry rolls back any stock effect.
        const latest = await clock();
        if (approved && latest.expired)
          throw new Error("Payment expired during finalization");
        const status = latest.expired
          ? "PAYMENT_EXPIRED"
          : approved
            ? "PAID"
            : "PAYMENT_FAILED";
        const paymentStatus = latest.expired
          ? "EXPIRED"
          : approved
            ? "APPROVED"
            : "DECLINED";
        const changed = await business
          .update(orderPayments)
          .set({ status: paymentStatus, completedAt: sql`clock_timestamp()` })
          .where(
            and(
              eq(orderPayments.id, payment.id),
              eq(orderPayments.status, "PENDING"),
            ),
          )
          .returning({ id: orderPayments.id });
        const updated = await business
          .update(orders)
          .set({ status })
          .where(
            and(
              eq(orders.id, order.id),
              eq(orders.userId, userId),
              eq(orders.status, "PENDING_PAYMENT"),
            ),
          )
          .returning({ id: orders.id });
        if (changed.length !== 1 || updated.length !== 1)
          throw new Error("Payment conflict");
        await writeAuditEvent(business, {
          eventType: "order.completed",
          outcome: approved ? "SUCCESS" : "FAILED",
          actorUserId: userId,
          targetType: "order",
          targetId: order.id,
        });
        await assertSession();
        if (approved && (await clock()).expired)
          throw new Error("Payment expired before commit");
        return { success: true as const, status };
      })
      .catch(() => null); // Preserve the reserved budget, rollback all commercial effects.
  });
  if (result === null)
    throw new Error("Não foi possível confirmar o pagamento simulado.");
  return result;
}
