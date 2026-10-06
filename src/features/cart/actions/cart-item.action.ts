"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { removeCartItem, updateCartItem } from "../server/mutate-cart";

export async function updateCartItemAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await updateCartItem(extra.length ? undefined : input);
  if (result.success) revalidatePath("/cart");
  return result;
}
export async function removeCartItemAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await removeCartItem(extra.length ? undefined : input);
  if (result.success) revalidatePath("/cart");
  return result;
}
