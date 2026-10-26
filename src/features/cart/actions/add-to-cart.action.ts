"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { rememberCartIntent } from "../server/cart-intent";
import { addToCart } from "../server/mutate-cart";

export async function addToCartAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await addToCart(extra.length ? undefined : input);
  if (result.success) revalidatePath("/cart");
  if (!result.success && result.code === "UNAUTHENTICATED")
    return { ...result, redirectTo: await rememberCartIntent(input) };
  return result;
}
