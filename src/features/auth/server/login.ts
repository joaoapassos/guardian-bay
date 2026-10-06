import "server-only";
import { authenticationCredentialSchema } from "../schemas/credential.schema";
import { authenticate } from "./authenticate";
import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";

export async function login(input: unknown) {
  const parsed = authenticationCredentialSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  if (!(await reserveLoginAttempt(parsed.data.email)))
    return { success: false as const, code: "RATE_LIMITED" as const };
  const verification = await withLoginHashSlot((tx) =>
    authenticate(parsed.data, tx),
  );
  if (!verification.admitted)
    return { success: false as const, code: "RATE_LIMITED" as const };
  return verification.value
    ? { success: true as const, userId: verification.value }
    : { success: false as const, code: "INVALID_CREDENTIALS" as const };
}
