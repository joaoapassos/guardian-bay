"use server";
import { cookies } from "next/headers";
import { login } from "../server/login";
import { requireSameOrigin } from "../server/require-same-origin";
import { createSession } from "../server/session";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function loginAction(
  input: unknown,
  ...extraArguments: unknown[]
) {
  await requireSameOrigin();
  const result = await login(extraArguments.length ? undefined : input);
  if (!result.success) {
    if (result.code === "RATE_LIMITED")
      return {
        success: false as const,
        code: "RATE_LIMITED" as const,
        message:
          "Não foi possível autenticar agora. Tente novamente mais tarde.",
      };
    return { success: false as const, message: "Credenciais inválidas." };
  }
  const store = await cookies();
  const policy = sessionCookiePolicy();
  const session = await createSession(
    result.userId,
    store.get(policy.name)?.value,
  );
  store.set(policy.name, session.token, {
    ...policy,
    expires: session.expiresAt,
  });
  return { success: true as const };
}
