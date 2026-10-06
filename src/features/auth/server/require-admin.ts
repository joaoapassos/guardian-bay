import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { sessionValidity, tokenHash } from "./session";
import { sessionCookiePolicy } from "./session-cookie";

export async function requireAuthenticatedAdmin() {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
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
