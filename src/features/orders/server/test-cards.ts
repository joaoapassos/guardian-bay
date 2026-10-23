import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { savedTestCards } from "@/db/schema/saved-test-cards";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import { removeTestCardSchema, saveTestCardSchema } from "../schemas/test-card";
import { testCardFixtures } from "../test-card-fixtures";
import { withPaymentSession } from "./payment-session";

export async function readTestCards() {
  const hash = tokenHash(
    (await cookies()).get(sessionCookiePolicy().name)?.value,
  );
  if (!hash) return [];
  try {
    return await getDb()
      .select({
        id: savedTestCards.id,
        brand: savedTestCards.brand,
        last4: savedTestCards.last4,
        expiryMonth: savedTestCards.expiryMonth,
        expiryYear: savedTestCards.expiryYear,
      })
      .from(savedTestCards)
      .innerJoin(sessions, eq(sessions.userId, savedTestCards.userId))
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .orderBy(savedTestCards.createdAt)
      .limit(3);
  } catch {
    throw new Error("Não foi possível consultar os cartões fictícios.");
  }
}

export async function saveTestCard(input: unknown) {
  const parsed = saveTestCardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  return withPaymentSession(async (tx, userId) => {
    if (!(await reserveAbuseBudget(tx, userId, "payment.cards")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    const [clock] = await tx
      .select({
        valid: sql<boolean>`(${parsed.data.expiryYear} * 12 + ${parsed.data.expiryMonth}) >= (extract(year from clock_timestamp() at time zone 'UTC')::int * 12 + extract(month from clock_timestamp() at time zone 'UTC')::int)`,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .limit(1);
    if (!clock?.valid)
      return { success: false as const, code: "INVALID_INPUT" as const };
    const fixture = testCardFixtures.find(
      (item) => item.id === parsed.data.fixtureId,
    );
    if (!fixture)
      return { success: false as const, code: "INVALID_INPUT" as const };
    await tx
      .insert(savedTestCards)
      .values({ userId, ...parsed.data, brand: "TEST", last4: fixture.last4 })
      .onConflictDoNothing({
        target: [savedTestCards.userId, savedTestCards.fixtureId],
      });
    return { success: true as const };
  });
}

export async function removeTestCard(input: unknown) {
  const parsed = removeTestCardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  return withPaymentSession(async (tx, userId) => {
    if (!(await reserveAbuseBudget(tx, userId, "payment.cards")))
      return { success: false as const, code: "RATE_LIMITED" as const };
    await tx
      .delete(savedTestCards)
      .where(
        and(
          eq(savedTestCards.id, parsed.data.cardId),
          eq(savedTestCards.userId, userId),
        ),
      );
    return { success: true as const };
  });
}
