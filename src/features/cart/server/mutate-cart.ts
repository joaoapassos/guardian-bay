import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { cartItems } from "@/db/schema/cart-items";
import { products } from "@/db/schema/products";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { cartItemSchema, removeCartItemSchema } from "../schemas/cart-item";

async function mutateCart(
  operation: "add" | "update" | "remove",
  input: unknown,
) {
  const parsed = (
    operation === "remove" ? removeCartItemSchema : cartItemSchema
  ).safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx
      .select({ id: sessions.userId })
      .from(sessions)
      .where(eq(sessions.tokenHash, hash))
      .limit(1);
    if (!candidate)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, candidate.id))
      .for("update");
    if (!user)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const valid = () =>
      and(
        eq(sessions.tokenHash, hash),
        eq(sessions.userId, user.id),
        sql`${sessions.expiresAt} > clock_timestamp()`,
        sql`${sessions.lastActiveAt} > clock_timestamp() - interval '30 minutes'`,
      );
    const [session] = await tx
      .select({ id: sessions.userId })
      .from(sessions)
      .where(valid())
      .for("update");
    if (!session)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const ownItem = and(
      eq(cartItems.userId, user.id),
      eq(cartItems.productId, parsed.data.productId),
    );
    if (operation === "remove") {
      await tx.delete(cartItems).where(ownItem);
    } else {
      const quantity =
        "quantity" in parsed.data && typeof parsed.data.quantity === "number"
          ? parsed.data.quantity
          : 0;
      const [product] = await tx
        .select({ published: products.isPublished })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .for("share");
      if (!product?.published)
        return { success: false as const, code: "UNAVAILABLE" as const };
      if (operation === "update") {
        const changed = await tx
          .update(cartItems)
          .set({ quantity })
          .where(ownItem)
          .returning({ quantity: cartItems.quantity });
        if (!changed.length)
          return { success: false as const, code: "CONFLICT" as const };
      } else {
        const existing = await tx
          .select({ productId: cartItems.productId })
          .from(cartItems)
          .where(eq(cartItems.userId, user.id))
          .limit(100);
        if (
          existing.length >= 100 &&
          !existing.some((item) => item.productId === parsed.data.productId)
        )
          return { success: false as const, code: "LIMIT_REACHED" as const };
        const changed = await tx
          .insert(cartItems)
          .values({
            userId: user.id,
            productId: parsed.data.productId,
            quantity,
          })
          .onConflictDoUpdate({
            target: [cartItems.userId, cartItems.productId],
            set: { quantity: sql`${cartItems.quantity} + ${quantity}` },
            setWhere: sql`${cartItems.quantity} + ${quantity} <= 99`,
          })
          .returning({ quantity: cartItems.quantity });
        if (!changed.length)
          return { success: false as const, code: "LIMIT_REACHED" as const };
      }
    }
    // Throwing rolls back any effect if expiration occurs during a lock wait.
    if (
      !(
        await tx
          .select({ id: sessions.userId })
          .from(sessions)
          .where(valid())
          .limit(1)
      ).length
    )
      throw new Error("Não foi possível concluir a operação do carrinho.");
    return { success: true as const };
  });
}

export async function addToCart(input: unknown) {
  return mutateCart("add", input);
}
export async function updateCartItem(input: unknown) {
  return mutateCart("update", input);
}
export async function removeCartItem(input: unknown) {
  return mutateCart("remove", input);
}
