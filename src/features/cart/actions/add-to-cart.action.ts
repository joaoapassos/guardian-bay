"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { addToCart } from "../server/add-to-cart";

export async function addToCartAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await addToCart(extra.length ? undefined : input);
  if (result.success) revalidatePath("/cart");
  return result;
}
