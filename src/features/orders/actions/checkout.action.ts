"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { createOrder } from "../server/create-order";
export async function checkoutAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await createOrder(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/cart");
    revalidatePath("/orders");
  }
  return result;
}
