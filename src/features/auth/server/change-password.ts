import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { changePasswordSchema } from "../schemas/change-password.schema";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import { hashPassword, verifyPassword } from "./password";
import { securityEvent } from "./security-event";
import { resolveSession, sessionValidity, tokenHash } from "./session";

export async function changePassword(input: unknown, token: unknown) {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const identity = await resolveSession(token);
  if (!identity)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  if (!(await reserveLoginAttempt(identity.email, "password-change")))
    return { success: false as const, code: "RATE_LIMITED" as const };
  const hash = tokenHash(token) as string;
  const result = await withLoginHashSlot(async (tx) => {
    // Same lock order as session creation: identity first, then session.
    const [user] = await tx
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, identity.id))
      .for("update");
    const [session] = await tx
      .select({ tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, hash),
          eq(sessions.userId, identity.id),
          sessionValidity(),
        ),
      )
      .for("update");
    if (!user || !session)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    if (
      !(await verifyPassword(parsed.data.currentPassword, user.passwordHash)) ||
      parsed.data.newPassword === parsed.data.currentPassword
    )
      return { success: false as const, code: "INVALID_CREDENTIALS" as const };
    const passwordHash = await hashPassword(parsed.data.newPassword);
    // Recheck wall-clock expiry after expensive hashing, inside the mutation.
    const [changed] = await tx
      .update(users)
      .set({ passwordHash })
      .where(
        and(
          eq(users.id, identity.id),
          sql`EXISTS (SELECT 1 FROM ${sessions} WHERE ${sessions.tokenHash} = ${hash} AND ${sessions.userId} = ${identity.id} AND ${sessions.expiresAt} > clock_timestamp() AND ${sessions.lastActiveAt} > clock_timestamp() - interval '30 minutes')`,
        ),
      )
      .returning({ id: users.id });
    if (!changed)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    await tx.delete(sessions).where(eq(sessions.userId, identity.id));
    return { success: true as const };
  }, "password-change");
  if (!result.admitted)
    return { success: false as const, code: "RATE_LIMITED" as const };
  if (result.value.success)
    securityEvent("password-change", "CREDENTIAL_CHANGED");
  return result.value;
}
