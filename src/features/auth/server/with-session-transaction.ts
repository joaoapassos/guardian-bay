import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";

export type PaymentTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
const expired = Symbol("expired");
export async function withAuthenticatedTransaction<T>(
  operation: (
    tx: PaymentTransaction,
    userId: string,
    assertSession: () => Promise<void>,
  ) => Promise<T>,
) {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  const denied = { success: false as const, code: "UNAUTHENTICATED" as const };
  if (!hash) return denied;
  try {
    return await getDb().transaction(async (tx) => {
      const [candidate] = await tx
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.tokenHash, hash))
        .limit(1);
      if (!candidate) return denied;
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, candidate.userId))
        .for("update");
      if (!user) return denied;
      const valid = and(
        eq(sessions.tokenHash, hash),
        eq(sessions.userId, user.id),
        sql`${sessions.expiresAt} > clock_timestamp()`,
        sql`${sessions.lastActiveAt} > clock_timestamp() - interval '30 minutes'`,
      );
      if (
        !(
          await tx
            .select({ id: sessions.userId })
            .from(sessions)
            .where(valid)
            .for("update")
        ).length
      )
        return denied;
      const assertSession = async () => {
        if (
          !(
            await tx
              .select({ id: sessions.userId })
              .from(sessions)
              .where(valid)
              .limit(1)
          ).length
        )
          throw expired;
      };
      const result = await operation(tx, user.id, assertSession);
      await assertSession();
      return result;
    });
  } catch (error) {
    if (error === expired) return denied;
    throw new Error("Não foi possível processar a simulação.");
  }
}
