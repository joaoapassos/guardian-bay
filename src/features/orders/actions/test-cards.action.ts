"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { removeTestCard, saveTestCard } from "../server/test-cards";

export async function saveTestCardAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await saveTestCard(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/account");
    revalidatePath("/checkout");
  }
  return result;
}
export async function removeTestCardAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await removeTestCard(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/account");
    revalidatePath("/checkout");
  }
  return result;
}
