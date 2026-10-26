"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import {
  removePaymentMethod,
  savePaymentMethod,
} from "../server/payment-methods";

export async function savePaymentMethodAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await savePaymentMethod(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/account/payment-methods");
    revalidatePath("/checkout");
  }
  return result;
}

export async function removePaymentMethodAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await removePaymentMethod(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/account/payment-methods");
    revalidatePath("/checkout");
  }
  return result;
}
