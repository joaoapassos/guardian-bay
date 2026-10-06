"use server";
import { cookies } from "next/headers";
import { requireSameOrigin } from "../server/require-same-origin";
import { revokeSession } from "../server/session";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function logoutAction(...argumentsReceived: unknown[]) {
  await requireSameOrigin();
  if (argumentsReceived.length)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const store = await cookies();
  const policy = sessionCookiePolicy();
  await revokeSession(store.get(policy.name)?.value);
  store.set(policy.name, "", { ...policy, expires: new Date(0), maxAge: 0 });
  return { success: true as const };
}
