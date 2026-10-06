"use server";
import { cookies } from "next/headers";
import { readOwnIdentity } from "../server/read-own-identity";
import { requireSameOrigin } from "../server/require-same-origin";
import { recordSessionActivity } from "../server/session";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function readIdentityAction(
  input: unknown,
  ...extraArguments: unknown[]
) {
  await requireSameOrigin();
  if (extraArguments.length)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const result = await readOwnIdentity(input);
  if (result.success) {
    const store = await cookies();
    await recordSessionActivity(store.get(sessionCookiePolicy().name)?.value);
    return result;
  }
  // Only this self-identity operation conceals forbidden resource existence.
  const code = result.code === "FORBIDDEN" ? "NOT_FOUND" : result.code;
  return { success: false as const, code };
}
