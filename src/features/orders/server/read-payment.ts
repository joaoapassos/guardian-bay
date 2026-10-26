import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { orderPayments } from "@/db/schema/order-payments";
import { orders } from "@/db/schema/orders";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";

export async function readPayment(input: unknown) {
  const id = z.uuid().safeParse(input);
  const hash = tokenHash(
    (await cookies()).get(sessionCookiePolicy().name)?.value,
  );
  if (!id.success || !hash) return null;
  try {
    const [payment] = await getDb()
      .select({
        id: orderPayments.id,
        method: orderPayments.method,
        status: orderPayments.status,
        cardLast4: orderPayments.cardLast4,
        cardBrand: orderPayments.cardBrand,
        approvableAt: orderPayments.approvableAt,
        expiresAt: orderPayments.expiresAt,
        serverNow: sql<Date>`clock_timestamp()`,
      })
      .from(orderPayments)
      .innerJoin(orders, eq(orders.id, orderPayments.orderId))
      .innerJoin(sessions, eq(sessions.userId, orders.userId))
      .where(
        and(
          eq(orders.id, id.data),
          eq(sessions.tokenHash, hash),
          sessionValidity(),
        ),
      )
      .limit(1);
    if (!payment) return null;
    return {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      approvableAt: payment.approvableAt.toISOString(),
      expiresAt: payment.expiresAt.toISOString(),
      serverNow: new Date(payment.serverNow).toISOString(),
    };
  } catch {
    throw new Error("Não foi possível consultar o pagamento simulado.");
  }
}
