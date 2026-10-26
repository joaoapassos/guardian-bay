"use server";
import { revalidatePath } from "next/cache";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { mutateAddress } from "../server/mutate-address";

export async function createAddressAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await mutateAddress(
    "create",
    extra.length ? undefined : input,
  );
  if (result.success && !("changed" in result && result.changed === false))
    revalidatePath("/account/addresses");
  return result;
}
export async function updateAddressAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await mutateAddress(
    "update",
    extra.length ? undefined : input,
  );
  if (result.success && !("changed" in result && result.changed === false))
    revalidatePath("/account/addresses");
  return result;
}
export async function removeAddressAction(input: unknown, ...extra: unknown[]) {
  await requireSameOrigin();
  const result = await mutateAddress(
    "remove",
    extra.length ? undefined : input,
  );
  if (result.success && !("changed" in result && result.changed === false))
    revalidatePath("/account/addresses");
  return result;
}
