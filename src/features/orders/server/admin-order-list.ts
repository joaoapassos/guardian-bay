import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { orders } from "@/db/schema/orders";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { moneyDto } from "@/lib/money/price";
import { adminOrderQuerySchema } from "../schemas/admin-order-query";
import { orderFailure } from "./order-event";

export async function adminOrderList(input: unknown = {}) {
  const query = adminOrderQuerySchema.safeParse(input);
  if (!query.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const direction = query.data.sort === "created-asc" ? asc : desc;
      const rows = await tx
        .select({
          orderId: orders.id,
          createdAt: orders.createdAt,
          status: orders.status,
          amount: orders.totalAmount,
        })
        .from(orders)
        .where(
          and(
            query.data.status
              ? eq(orders.status, query.data.status)
              : undefined,
            query.data.orderId ? eq(orders.id, query.data.orderId) : undefined,
          ),
        )
        .orderBy(direction(orders.createdAt), direction(orders.id))
        .limit(query.data.limit + 1)
        .offset((query.data.page - 1) * query.data.limit);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return {
        success: true as const,
        query: query.data,
        hasNext: rows.length > query.data.limit && query.data.page < 1000,
        orders: rows.slice(0, query.data.limit).map((row) => ({
          orderId: row.orderId,
          createdAt: row.createdAt.toISOString(),
          status: row.status,
          total: moneyDto(row.amount),
        })),
      };
    });
  } catch {
    orderFailure("admin-list");
    throw new Error("Não foi possível consultar pedidos administrativos.");
  }
}
