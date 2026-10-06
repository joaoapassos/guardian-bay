import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { readIdentitySchema } from "../schemas/read-identity.schema";
import { securityEvent } from "./security-event";
import { sessionValidity, tokenHash } from "./session";
import {
  requireAuthenticatedIdentity,
  sessionCookiePolicy,
} from "./session-cookie";

// The caller supplies only a resource ID, never an authenticated identity.
export async function readOwnIdentity(input: unknown) {
  const parsed = readIdentitySchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const auth = await requireAuthenticatedIdentity();
  if (!auth.success) return auth;
  if (parsed.data.userId !== auth.identity.id)
    return { success: false as const, code: "FORBIDDEN" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    // Revalidate live session and persisted ownership in the protected query.
    const [identity] = await getDb()
      .select({ id: users.id, email: users.email })
      .from(users)
      .innerJoin(sessions, eq(sessions.userId, users.id))
      .where(
        and(
          eq(users.id, parsed.data.userId),
          eq(users.id, auth.identity.id),
          eq(sessions.tokenHash, hash),
          sessionValidity(),
        ),
      )
      .limit(1);
    return identity
      ? { success: true as const, identity }
      : { success: false as const, code: "NOT_FOUND" as const };
  } catch {
    securityEvent("identity-read", "OPERATION_FAILED");
    throw new Error("Não foi possível consultar a identidade.");
  }
}
