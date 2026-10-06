import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { cartItems } from "@/db/schema/cart-items";
import { orderItems } from "@/db/schema/order-items";
import { orders } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { checkoutSchema } from "../schemas/checkout";
import { simulatePayment } from "../simulated-payment";
import { checkoutCandidate } from "./checkout-preview";
import { orderFailure } from "./order-event";

const expired = Symbol("session-expired");
export async function createOrder(input: unknown) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    return await getDb().transaction(async (tx) => {
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
      const [existing] = await tx
        .select({ orderId: orders.id, status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.userId, user.id),
            eq(orders.checkoutKey, parsed.data.checkoutKey),
          ),
        )
        .limit(1);
      if (existing) return { success: true as const, ...existing };
      const items = await tx
        .select({
          productId: cartItems.productId,
          quantity: cartItems.quantity,
        })
        .from(cartItems)
        .where(eq(cartItems.userId, user.id))
        .orderBy(cartItems.productId)
        .limit(101)
        .for("update");
      if (!items.length)
        return { success: false as const, code: "EMPTY_CART" as const };
      const current = await tx
        .select({
          productId: products.id,
          productName: products.name,
          amount: products.amount,
          currency: products.currency,
          published: products.isPublished,
        })
        .from(products)
        .where(
          inArray(
            products.id,
            items.map((item) => item.productId),
          ),
        )
        .orderBy(products.id)
        .for("share");
      // Locked rows are re-read after any catalog wait; preview is never authority.
      if (
        !(
          await tx
            .select({ id: sessions.userId })
            .from(sessions)
            .where(valid())
            .limit(1)
        ).length
      )
        throw expired;
      if (current.length !== items.length)
        return { success: false as const, code: "UNAVAILABLE" as const };
      const checked = checkoutCandidate(
        current.map((product) => ({
          ...product,
          quantity:
            items.find((item) => item.productId === product.productId)
              ?.quantity ?? null,
        })),
      );
      if (!checked.success) return checked;
      const [order] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          checkoutKey: parsed.data.checkoutKey,
          totalAmount: checked.snapshot.total.amount,
        })
        .returning({ orderId: orders.id, status: orders.status });
      await tx.insert(orderItems).values(
        checked.snapshot.items.map((item) => ({
          ...item,
          orderId: order.orderId,
        })),
      );
      if (
        !(
          await tx
            .select({ id: sessions.userId })
            .from(sessions)
            .where(valid())
            .limit(1)
        ).length
      )
        throw expired;
      const status = simulatePayment({
        status: order.status,
        totalAmount: checked.snapshot.total.amount,
      });
      await tx
        .update(orders)
        .set({ status })
        .where(
          and(
            eq(orders.id, order.orderId),
            eq(orders.userId, user.id),
            eq(orders.status, "PENDING_PAYMENT"),
          ),
        );
      if (status === "PAID") {
        // Identity lock serializes cart mutations; delete only snapshot products.
        await tx.delete(cartItems).where(
          and(
            eq(cartItems.userId, user.id),
            inArray(
              cartItems.productId,
              checked.snapshot.items.map((item) => item.productId),
            ),
          ),
        );
      }
      if (
        !(
          await tx
            .select({ id: sessions.userId })
            .from(sessions)
            .where(valid())
            .limit(1)
        ).length
      )
        throw expired;
      return { success: true as const, orderId: order.orderId, status };
    });
  } catch (error) {
    if (error === expired)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    orderFailure("create");
    throw new Error("Não foi possível concluir o checkout.");
  }
}
