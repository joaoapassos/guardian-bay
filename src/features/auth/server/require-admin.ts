import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { sessionValidity, tokenHash } from "./session";
import { sessionCookiePolicy } from "./session-cookie";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export async function requireAuthenticatedAdmin(tx?: Transaction) {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  if (tx) {
    const [candidate] = await tx
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.tokenHash, hash))
      .limit(1);
    if (!candidate)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    // Same lock order as credential changes: identity, then session.
    const [user] = await tx
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, candidate.userId))
      .for("update");
    if (!user || user.role !== "admin")
      return { success: false as const, code: "FORBIDDEN" as const };
    const [session] = await tx
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, hash),
          eq(sessions.userId, user.id),
          sql`${sessions.expiresAt} > clock_timestamp()`,
          sql`${sessions.lastActiveAt} > clock_timestamp() - interval '30 minutes'`,
        ),
      )
      .for("update");
    return session
      ? { success: true as const, identity: { id: user.id } }
      : { success: false as const, code: "UNAUTHENTICATED" as const };
  }
  const [identity] = await getDb()
    .select({ id: users.id, role: users.role })
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
    .limit(1);
  if (!identity)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  return identity.role === "admin"
    ? { success: true as const, identity: { id: identity.id } }
    : { success: false as const, code: "FORBIDDEN" as const };
}
