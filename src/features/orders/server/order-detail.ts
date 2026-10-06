import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { orderItems } from "@/db/schema/order-items";
import { orders } from "@/db/schema/orders";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { moneyDto } from "@/lib/money/price";
import { orderFailure } from "./order-event";
export async function orderDetail(input: unknown) {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "NOT_FOUND" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    const rows = await getDb()
      .select({
        orderId: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
        total: orders.totalAmount,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitAmount: orderItems.unitAmount,
        subtotal: orderItems.subtotalAmount,
      })
      .from(orders)
      .innerJoin(sessions, eq(sessions.userId, orders.userId))
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.id, parsed.data),
          eq(sessions.tokenHash, hash),
          sessionValidity(),
        ),
      )
      .orderBy(orderItems.productId)
      .limit(101);
    if (!rows.length)
      return { success: false as const, code: "NOT_FOUND" as const };
    const order = rows[0];
    return {
      success: true as const,
      order: {
        orderId: order.orderId,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        total: moneyDto(order.total),
        items: rows.map((row) => ({
          productName: row.productName,
          quantity: row.quantity,
          price: moneyDto(row.unitAmount),
          subtotal: moneyDto(row.subtotal),
        })),
      },
    };
  } catch {
    orderFailure("detail");
    throw new Error("Não foi possível consultar o pedido.");
  }
}
