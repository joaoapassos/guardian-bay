import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { cartItems } from "@/db/schema/cart-items";
import { products } from "@/db/schema/products";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { productImage } from "@/features/catalog/images";
import { priceDto } from "@/lib/money/price";
import { calculateCart } from "../cart-money";
import { cartFailure } from "./cart-event";

export async function readCart() {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    // One snapshot validates session and scopes all items, including empty carts.
    const rows = await getDb()
      .select({
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        name: products.name,
        amount: products.amount,
        currency: products.currency,
        available: products.isPublished,
        imageKey: products.imageKey,
      })
      .from(sessions)
      .leftJoin(cartItems, eq(cartItems.userId, sessions.userId))
      .leftJoin(products, eq(products.id, cartItems.productId))
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .orderBy(cartItems.productId)
      .limit(101);
    if (!rows.length)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const items = rows.flatMap((row) => {
      if (!row.productId) return [];
      if (row.name === null || row.quantity === null || row.available === null)
        throw new Error("Não foi possível consultar o carrinho.");
      return [
        {
          productId: row.productId,
          name: row.name,
          quantity: row.quantity,
          available: row.available,
          price: priceDto({ amount: row.amount, currency: row.currency }),
          image: productImage(row.imageKey, row.name),
        },
      ];
    });
    return { success: true as const, ...calculateCart(items) };
  } catch {
    cartFailure("read");
    throw new Error("Não foi possível consultar o carrinho.");
  }
}
