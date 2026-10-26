import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import type { z } from "zod";
import { getDb } from "@/db";
import { savedPaymentMethods } from "@/db/schema/payment-methods";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import {
  type PaymentTransaction,
  withAuthenticatedTransaction,
} from "@/features/auth/server/with-session-transaction";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import {
  type CardMetadata,
  cardInputSchema,
  cardMetadata,
  checkoutCardPaymentSchema,
  type PaymentMethodDto,
  removePaymentMethodSchema,
} from "../schemas/card";

const columns = {
  id: savedPaymentMethods.id,
  brand: savedPaymentMethods.brand,
  last4: savedPaymentMethods.last4,
  expiryMonth: savedPaymentMethods.expiryMonth,
  expiryYear: savedPaymentMethods.expiryYear,
};
const invalid = { success: false as const, code: "INVALID_INPUT" as const };
const limitReached = {
  success: false as const,
  code: "LIMIT_REACHED" as const,
};

export async function readPaymentMethods() {
  const hash = tokenHash(
    (await cookies()).get(sessionCookiePolicy().name)?.value,
  );
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    const rows = await getDb()
      .select(columns)
      .from(sessions)
      .leftJoin(
        savedPaymentMethods,
        eq(savedPaymentMethods.userId, sessions.userId),
      )
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .orderBy(savedPaymentMethods.createdAt, savedPaymentMethods.id)
      .limit(3);
    if (!rows.length)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const paymentMethods: PaymentMethodDto[] = rows.flatMap((row) =>
      row.id
        ? [
            {
              id: row.id,
              brand: row.brand as CardMetadata["brand"],
              last4: row.last4 as string,
              expiryMonth: row.expiryMonth as number,
              expiryYear: row.expiryYear as number,
            },
          ]
        : [],
    );
    return { success: true as const, paymentMethods };
  } catch {
    throw new Error("Não foi possível consultar as formas de pagamento.");
  }
}

async function validAtDatabaseClock(
  tx: PaymentTransaction,
  metadata: CardMetadata,
) {
  const [clock] = await tx.execute<{ valid: boolean }>(
    sql`SELECT (${metadata.expiryYear} * 12 + ${metadata.expiryMonth}) >= (extract(year from clock_timestamp() at time zone 'UTC')::int * 12 + extract(month from clock_timestamp() at time zone 'UTC')::int) AS valid`,
  );
  return clock?.valid === true;
}

// Caller already holds identity/session locks. Resolve is read-only: checkout
// persists metadata only after all business checks, in its own transaction.
export async function resolveCheckoutCard(
  tx: PaymentTransaction,
  userId: string,
  input: z.input<typeof checkoutCardPaymentSchema>,
) {
  const parsed = checkoutCardPaymentSchema.safeParse(input);
  if (!parsed.success) return invalid;
  let metadata: CardMetadata;
  if ("paymentMethodId" in parsed.data) {
    const [row] = await tx
      .select(columns)
      .from(savedPaymentMethods)
      .where(
        and(
          eq(savedPaymentMethods.id, parsed.data.paymentMethodId),
          eq(savedPaymentMethods.userId, userId),
        ),
      )
      .for("share");
    if (!row) return invalid;
    metadata = {
      brand: row.brand as CardMetadata["brand"],
      last4: row.last4,
      expiryMonth: row.expiryMonth,
      expiryYear: row.expiryYear,
    };
  } else metadata = cardMetadata(parsed.data.card);
  if (!(await validAtDatabaseClock(tx, metadata))) return invalid;
  return { success: true as const, card: metadata };
}

// Internal helper; caller must hold the authenticated user's identity lock.
// The input is a server-derived projection, never client-supplied metadata.
export async function persistPaymentMethod(
  tx: PaymentTransaction,
  userId: string,
  metadata: CardMetadata,
) {
  const rows = await tx
    .select({ id: savedPaymentMethods.id })
    .from(savedPaymentMethods)
    .where(eq(savedPaymentMethods.userId, userId))
    .limit(3);
  if (rows.length >= 3) return limitReached;
  if (!(await validAtDatabaseClock(tx, metadata))) return invalid;
  await tx.insert(savedPaymentMethods).values({ userId, ...metadata });
  return { success: true as const };
}

export async function savePaymentMethod(input: unknown) {
  const parsed = cardInputSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const metadata = cardMetadata(parsed.data);
  return withAuthenticatedTransaction(async (tx, userId) => {
    if (!(await reserveAbuseBudget(tx, userId, "payment.cards")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    return persistPaymentMethod(tx, userId, metadata);
  });
}

export async function removePaymentMethod(input: unknown) {
  const parsed = removePaymentMethodSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return withAuthenticatedTransaction(async (tx, userId) => {
    if (!(await reserveAbuseBudget(tx, userId, "payment.cards")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    await tx
      .delete(savedPaymentMethods)
      .where(
        and(
          eq(savedPaymentMethods.id, parsed.data.id),
          eq(savedPaymentMethods.userId, userId),
        ),
      );
    return { success: true as const };
  });
}
