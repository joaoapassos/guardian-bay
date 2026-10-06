"use server";
import { register } from "../server/register";
import { requireSameOrigin } from "../server/require-same-origin";

export async function registerAction(
  input: unknown,
  ...extraArguments: unknown[]
) {
  await requireSameOrigin();
  return register(extraArguments.length ? undefined : input);
}
