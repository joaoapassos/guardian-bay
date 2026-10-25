"use server";
import { register } from "../server/register";
import { requireSameOrigin } from "../server/require-same-origin";
import { loginAction } from "./login.action";

export async function registerAction(
  input: unknown,
  ...extraArguments: unknown[]
) {
  await requireSameOrigin();
  const result = await register(extraArguments.length ? undefined : input);
  if (!result.success) return result;
  // Reuse credential verification, abuse budgets, rotation and secure cookie
  // delivery. A duplicate INSERT result alone never establishes a session.
  const authentication = await loginAction(input);
  if (authentication.success) return { success: true as const };
  return {
    success: false as const,
    code:
      authentication.code === "RATE_LIMITED"
        ? ("RATE_LIMITED" as const)
        : ("INVALID_CREDENTIALS" as const),
  };
}
