import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { orderItems } from "@/db/schema/order-items";
import { orders } from "@/db/schema/orders";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { moneyDto } from "@/lib/money/price";
import { orderFailure } from "./order-event";

export async function adminOrderDetail(input: unknown) {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "NOT_FOUND" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const rows = await tx
        .select({
          orderId: orders.id,
          createdAt: orders.createdAt,
          status: orders.status,
          total: orders.totalAmount,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          unitAmount: orderItems.unitAmount,
          subtotal: orderItems.subtotalAmount,
        })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(eq(orders.id, parsed.data))
        .orderBy(orderItems.productId)
        .limit(101);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      if (!rows.length)
        return { success: false as const, code: "NOT_FOUND" as const };
      const order = rows[0];
      return {
        success: true as const,
        order: {
          orderId: order.orderId,
          createdAt: order.createdAt.toISOString(),
          status: order.status,
          total: moneyDto(order.total),
          items: rows.map((row) => ({
            productName: row.productName,
            quantity: row.quantity,
            price: moneyDto(row.unitAmount),
            subtotal: moneyDto(row.subtotal),
          })),
        },
      };
    });
  } catch {
    orderFailure("admin-detail");
    throw new Error("Não foi possível consultar o pedido administrativo.");
  }
}
