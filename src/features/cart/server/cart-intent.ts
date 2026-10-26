import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "@/db";
import { cartIntents } from "@/db/schema/cart-intents";
import { loginHref, safeReturn } from "@/features/auth/safe-return";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/session-cookie-policy";
import { cartItemSchema } from "../schemas/cart-item";
import { addToCart } from "./mutate-cart";

function intentCookie() {
  const policy = sessionCookiePolicy();
  return {
    ...policy,
    name: policy.secure
      ? "__Host-guardian-cart-intent"
      : "guardian-cart-intent",
    maxAge: 600,
  };
}

export async function rememberCartIntent(input: unknown) {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success) return undefined;
  const requestHeaders = await headers();
  let returnTo = `/products/${parsed.data.productId}`;
  try {
    const referrer = new URL(requestHeaders.get("referer") ?? "");
    if (referrer.origin === requestHeaders.get("origin"))
      returnTo = safeReturn(referrer.pathname + referrer.search);
  } catch {
    /* A missing referrer uses the product destination. */
  }
  const store = await cookies();
  const policy = intentCookie();
  const previous = tokenHash(store.get(policy.name)?.value);
  const nonce = randomBytes(32).toString("hex");
  const hash = tokenHash(nonce) as string;
  const saved = await getDb().transaction(async (tx) => {
    // Serialize only anonymous intent admission, never identity/cart mutations.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(210467, 1)`);
    if (previous)
      await tx.delete(cartIntents).where(eq(cartIntents.tokenHash, previous));
    // Bounded lifetime; cleanup only these noncommercial expired intentions.
    await tx
      .delete(cartIntents)
      .where(sql`${cartIntents.expiresAt} <= clock_timestamp()`);
    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(cartIntents);
    if ((usage?.count ?? 1000) >= 1000) return false;
    await tx.insert(cartIntents).values({
      tokenHash: hash,
      ...parsed.data,
      returnTo,
      expiresAt: new Date(Date.now() + policy.maxAge * 1000),
    });
    return true;
  });
  if (!saved) return undefined;
  store.set(policy.name, nonce, policy);
  return loginHref(returnTo);
}

export async function resumeCartIntent() {
  const store = await cookies();
  const policy = intentCookie();
  const hash = tokenHash(store.get(policy.name)?.value);
  // Discard before attempting. A response/network failure must never auto-replay.
  store.set(policy.name, "", { ...policy, maxAge: 0 });
  if (!hash) return { resumed: false as const };
  const [intent] = await getDb()
    .select({
      productId: cartIntents.productId,
      quantity: cartIntents.quantity,
      returnTo: cartIntents.returnTo,
    })
    .from(cartIntents)
    .where(
      and(
        eq(cartIntents.tokenHash, hash),
        isNull(cartIntents.consumedAt),
        sql`${cartIntents.expiresAt} > clock_timestamp()`,
      ),
    )
    .limit(1);
  if (!intent) return { resumed: false as const };
  const result = await addToCart(
    { productId: intent.productId, quantity: intent.quantity },
    hash,
  );
  const destination = new URL(
    safeReturn(intent.returnTo),
    "https://guardian.invalid",
  );
  destination.searchParams.set("cart", "open");
  destination.searchParams.set(
    "cartResult",
    result.success ? "ADDED" : result.code,
  );
  return {
    resumed: true as const,
    ...result,
    redirectTo: destination.pathname + destination.search,
  };
}
