"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { confirmPayment } from "../server/confirm-payment";
export async function confirmPaymentAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await confirmPayment(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/account/orders", "layout");
    revalidatePath("/products", "layout");
    revalidatePath("/admin", "layout");
  }
  return result;
}
