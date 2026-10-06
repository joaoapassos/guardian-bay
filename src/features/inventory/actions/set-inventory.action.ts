"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { setInventoryQuantity } from "../server/set-inventory";
export async function setInventoryQuantityAction(
  input: unknown,
  ...extra: unknown[]
) {
  await requireSameOrigin();
  const result = await setInventoryQuantity(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/admin/catalog");
    revalidatePath("/products", "layout");
    revalidatePath("/cart");
    revalidatePath("/checkout");
  }
  return result;
}
