"use server";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { resumeCartIntent } from "../server/cart-intent";

// No client data: the HttpOnly opaque cookie selects a short-lived server record.
export async function resumeCartIntentAction(...extra: unknown[]) {
  await requireSameOrigin();
  if (extra.length) return { resumed: false as const };
  return resumeCartIntent();
}
