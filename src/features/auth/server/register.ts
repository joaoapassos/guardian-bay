import "server-only";
import { users } from "@/db/schema/users";
import { credentialSchema } from "../schemas/credential.schema";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import { hashPassword } from "./password";

export async function register(input: unknown) {
  const parsed = credentialSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  if (!(await reserveLoginAttempt(parsed.data.email, "register")))
    return { success: false as const, code: "RATE_LIMITED" as const };
  const slot = await withLoginHashSlot(async (tx) => {
    // Hash even duplicate accounts; uniqueness is enforced atomically by PG.
    const passwordHash = await hashPassword(parsed.data.password);
    await tx
      .insert(users)
      .values({ email: parsed.data.email, passwordHash })
      .onConflictDoNothing({ target: users.email });
  }, "register");
  return slot.admitted
    ? { success: true as const }
    : { success: false as const, code: "RATE_LIMITED" as const };
}
