"use server";
import { cookies } from "next/headers";
import { changePassword } from "../server/change-password";
import { requireSameOrigin } from "../server/require-same-origin";
import { sessionCookiePolicy } from "../server/session-cookie";

export async function changePasswordAction(
  input: unknown,
  ...extraArguments: unknown[]
) {
  await requireSameOrigin();
  const store = await cookies();
  const policy = sessionCookiePolicy();
  const result = await changePassword(
    extraArguments.length ? undefined : input,
    store.get(policy.name)?.value,
  );
  if (result.success)
    store.set(policy.name, "", { ...policy, expires: new Date(0), maxAge: 0 });
  return result;
}
