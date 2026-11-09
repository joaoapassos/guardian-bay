import "server-only";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { orders } from "@/db/schema/orders";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { moneyDto } from "@/lib/money/price";

const schema = z.strictObject({
  userId: z.uuid(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export async function adminUserOrders(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const rows = await tx
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          status: orders.status,
          total: orders.totalAmount,
        })
        .from(orders)
        .where(eq(orders.userId, parsed.data.userId))
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(21)
        .offset((parsed.data.page - 1) * 20);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return {
        success: true as const,
        hasNext: rows.length > 20 && parsed.data.page < 1000,
        page: parsed.data.page,
        orders: rows.slice(0, 20).map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          total: moneyDto(row.total),
        })),
      };
    });
  } catch {
    throw new Error("Não foi possível consultar os pedidos.");
  }
}
