"use server";
import { cookies } from "next/headers";
import { requireSameOrigin } from "../server/require-same-origin";
import { revokeSession } from "../server/session";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function logoutAction() {
  await requireSameOrigin();
  const store = await cookies();
  const policy = sessionCookiePolicy();
  await revokeSession(store.get(policy.name)?.value);
  store.set(policy.name, "", { ...policy, expires: new Date(0), maxAge: 0 });
  return { success: true as const };
}
