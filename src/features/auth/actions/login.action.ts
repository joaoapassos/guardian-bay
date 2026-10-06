"use server";
import { cookies } from "next/headers";
import { authenticate } from "../server/authenticate";
import { requireSameOrigin } from "../server/require-same-origin";
import { createSession } from "../server/session";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function loginAction(input: unknown) {
  await requireSameOrigin();
  const userId = await authenticate(input);
  if (!userId)
    return { success: false as const, message: "Credenciais inválidas." };
  const store = await cookies();
  const policy = sessionCookiePolicy();
  const session = await createSession(userId, store.get(policy.name)?.value);
  store.set(policy.name, session.token, {
    ...policy,
    expires: session.expiresAt,
  });
  return { success: true as const };
}
