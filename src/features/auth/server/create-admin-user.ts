import "server-only";
import { users } from "@/db/schema/users";
import { writeAuditEvent } from "@/lib/audit/server";
import { adminUserCreateSchema } from "../schemas/admin-user-create.schema";
import { clearAdminUserListCache } from "./admin-users";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import { hashPassword } from "./password";
import { requireAuthenticatedAdmin } from "./require-admin";

export async function createAdminUser(input: unknown) {
  const parsed = adminUserCreateSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const access = await requireAuthenticatedAdmin();
  if (!access.success) return access;
  if (!(await reserveLoginAttempt(parsed.data.email, "register")))
    return { success: false as const, code: "RATE_LIMITED" as const };
  const slot = await withLoginHashSlot(async (tx) => {
    const auth = await requireAuthenticatedAdmin(tx);
    if (!auth.success) return auth;
    const passwordHash = await hashPassword(parsed.data.password);
    const fresh = await requireAuthenticatedAdmin(tx);
    if (!fresh.success) return fresh;
    const [user] = await tx
      .insert(users)
      .values({
        name: parsed.data.name || null,
        email: parsed.data.email,
        passwordHash,
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    if (!user) {
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return { success: false as const, code: "DUPLICATE" as const };
    }
    await writeAuditEvent(tx, {
      eventType: "admin.user.created",
      outcome: "SUCCESS",
      actorUserId: auth.identity.id,
      targetType: "user",
      targetId: user.id,
    });
    if (!(await requireAuthenticatedAdmin(tx)).success)
      throw new Error("AUTHORIZATION_EXPIRED");
    return { success: true as const, id: user.id };
  }, "register");
  if (!slot.admitted)
    return { success: false as const, code: "RATE_LIMITED" as const };
  if (slot.value.success) clearAdminUserListCache();
  return slot.value;
}
