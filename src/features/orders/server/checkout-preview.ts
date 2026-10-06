import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { cartItems } from "@/db/schema/cart-items";
import { inventory } from "@/db/schema/inventory";
import { products } from "@/db/schema/products";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { createOrderSnapshot } from "../order-snapshot";
import { orderFailure } from "./order-event";

export function checkoutCandidate(
  rows: {
    productId: string | null;
    productName: string | null;
    quantity: number | null;
    amount: number | null;
    currency: string | null;
    published: boolean | null;
    availableQuantity: number | null;
  }[],
) {
  if (!rows.some((row) => row.productId))
    return { success: false as const, code: "EMPTY_CART" as const };
  if (rows.some((row) => !row.published))
    return { success: false as const, code: "UNAVAILABLE" as const };
  if (
    rows.some(
      (row) =>
        row.quantity === null || (row.availableQuantity ?? 0) < row.quantity,
    )
  )
    return { success: false as const, code: "OUT_OF_STOCK" as const };
  return {
    success: true as const,
    snapshot: createOrderSnapshot(
      rows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        price: { amount: row.amount, currency: row.currency },
      })),
    ),
  };
}

export async function checkoutPreview() {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    const rows = await getDb()
      .select({
        productId: cartItems.productId,
        productName: products.name,
        quantity: cartItems.quantity,
        amount: products.amount,
        currency: products.currency,
        published: products.isPublished,
        availableQuantity: inventory.availableQuantity,
      })
      .from(sessions)
      .leftJoin(cartItems, eq(cartItems.userId, sessions.userId))
      .leftJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .orderBy(cartItems.productId)
      .limit(101);
    if (!rows.length)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    return checkoutCandidate(rows);
  } catch {
    orderFailure("preview");
    throw new Error("Não foi possível revisar o checkout.");
  }
}
