"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { saveProfile } from "../server/save-profile";
export async function saveProfileAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await saveProfile(extra.length ? undefined : input);
  if (result.success && !("changed" in result && result.changed === false))
    revalidatePath("/account", "layout");
  return result;
}
