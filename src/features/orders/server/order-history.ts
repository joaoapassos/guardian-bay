import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { orders } from "@/db/schema/orders";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import {
  getAuthenticatedIdentity,
  sessionCookiePolicy,
} from "@/features/auth/server/session-cookie";
import { moneyDto } from "@/lib/money/price";
import { orderFailure } from "./order-event";

const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export async function orderHistory(input: unknown = {}) {
  const query = querySchema.safeParse(input);
  if (!query.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const identity = await getAuthenticatedIdentity();
  if (!identity)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    const rows = await getDb()
      .select({
        orderId: orders.id,
        createdAt: orders.createdAt,
        status: orders.status,
        amount: orders.totalAmount,
      })
      .from(orders)
      .innerJoin(sessions, eq(orders.userId, sessions.userId))
      .where(
        and(
          eq(orders.userId, identity.id),
          eq(sessions.tokenHash, hash),
          sessionValidity(),
        ),
      )
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .offset((query.data.page - 1) * 20)
      .limit(21);
    return {
      success: true as const,
      page: query.data.page,
      hasNext: rows.length > 20 && query.data.page < 1000,
      orders: rows.slice(0, 20).map((row) => ({
        orderId: row.orderId,
        createdAt: row.createdAt.toISOString(),
        status: row.status,
        total: moneyDto(row.amount),
      })),
    };
  } catch {
    orderFailure("history");
    throw new Error("Não foi possível consultar pedidos.");
  }
}
