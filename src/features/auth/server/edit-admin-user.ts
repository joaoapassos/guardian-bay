import "server-only";
import { eq, sql } from "drizzle-orm";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { writeAuditEvent } from "@/lib/audit/server";
import { adminUserEditSchema } from "../schemas/admin-user-edit.schema";
import { clearAdminUserListCache } from "./admin-users";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import { hashPassword } from "./password";
import { requireAuthenticatedAdmin } from "./require-admin";

export async function editAdminUser(input: unknown) {
  const parsed = adminUserEditSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const access = await requireAuthenticatedAdmin();
  if (!access.success) return access;
  if (access.identity.id === parsed.data.userId)
    return { success: false as const, code: "SELF" as const };
  if (!(await reserveLoginAttempt(parsed.data.email, "register")))
    return { success: false as const, code: "RATE_LIMITED" as const };
  const slot = await withLoginHashSlot(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1195521365, 1)`);
    const auth = await requireAuthenticatedAdmin(tx);
    if (!auth.success) return auth;
    if (auth.identity.id === parsed.data.userId)
      return { success: false as const, code: "SELF" as const };
    const [target] = await tx
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, parsed.data.userId))
      .for("update");
    if (!target) return { success: false as const, code: "NOT_FOUND" as const };
    const [duplicate] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    if (duplicate && duplicate.id !== target.id) {
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return { success: false as const, code: "DUPLICATE" as const };
    }
    const passwordHash = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : undefined;
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    const name = parsed.data.name || null;
    if (
      target.name === name &&
      target.email === parsed.data.email &&
      !passwordHash
    )
      return { success: true as const };
    await tx
      .update(users)
      .set({
        name,
        email: parsed.data.email,
        ...(passwordHash ? { passwordHash } : {}),
      })
      .where(eq(users.id, target.id));
    if (target.email !== parsed.data.email || passwordHash)
      await tx.delete(sessions).where(eq(sessions.userId, target.id));
    await writeAuditEvent(tx, {
      eventType: "admin.user.updated",
      outcome: "SUCCESS",
      actorUserId: auth.identity.id,
      targetType: "user",
      targetId: target.id,
    });
    if (passwordHash)
      await writeAuditEvent(tx, {
        eventType: "admin.user.password_reset",
        outcome: "SUCCESS",
        actorUserId: auth.identity.id,
        targetType: "user",
        targetId: target.id,
      });
    if (!(await requireAuthenticatedAdmin(tx)).success)
      throw new Error("AUTHORIZATION_EXPIRED");
    return { success: true as const };
  }, "register");
  if (!slot.admitted)
    return { success: false as const, code: "RATE_LIMITED" as const };
  if (slot.value.success) clearAdminUserListCache();
  return slot.value;
}
