"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { manageCatalog } from "../server/manage-catalog";

export async function manageCatalogAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await manageCatalog(extra.length ? undefined : input);
  if (result.success) {
    revalidatePath("/admin/catalog");
    revalidatePath("/products", "layout");
  }
  return result;
}
