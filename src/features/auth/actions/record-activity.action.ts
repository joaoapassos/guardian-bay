"use server";
import { cookies } from "next/headers";
import { requireSameOrigin } from "../server/require-same-origin";
import { recordSessionActivity } from "../server/session";
import {
  requireAuthenticatedIdentity,
  sessionCookiePolicy,
} from "../server/session-cookie";

export async function recordActivityAction(...received: unknown[]) {
  await requireSameOrigin();
  if (received.length)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const auth = await requireAuthenticatedIdentity();
  if (!auth.success) return auth;
  const store = await cookies();
  await recordSessionActivity(store.get(sessionCookiePolicy().name)?.value);
  return { success: true as const };
}
