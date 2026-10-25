import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { addresses } from "@/db/schema/addresses";
import { cartItems } from "@/db/schema/cart-items";
import { inventory } from "@/db/schema/inventory";
import { orderItems } from "@/db/schema/order-items";
import { orderPayments } from "@/db/schema/order-payments";
import { orders } from "@/db/schema/orders";
import { products } from "@/db/schema/products";
import { savedTestCards } from "@/db/schema/saved-test-cards";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import {
  type AddressSnapshot,
  addressSnapshotSchema,
} from "@/features/addresses/schemas/address";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import { writeAuditEvent } from "@/lib/audit/server";
import { checkoutSchema } from "../schemas/checkout";
import { simulatePayment } from "../simulated-payment";
import { checkoutCandidate } from "./checkout-preview";
import { orderFailure } from "./order-event";

const expired = Symbol("session-expired");
const inventoryConflict = Symbol("inventory-conflict");
const invalidCard = Symbol("invalid-card");
export async function createOrder(input: unknown) {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    let failure: unknown;
    const result = await getDb().transaction(async (tx) => {
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
      if (!(await reserveAbuseBudget(tx, user.id, "checkout")))
        return { success: false as const, code: "RATE_LIMITED" as const };
      // Savepoint uses the same connection: reserve persists on business rollback.
      return tx
        .transaction(async (tx) => {
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
          let cardLast4: string | null = null;
          let shippingAddress: AddressSnapshot | null = null;
          if (parsed.data.addressId) {
            const [address] = await tx
              .select({
                recipient: addresses.recipient,
                postalCode: addresses.postalCode,
                street: addresses.street,
                number: addresses.number,
                complement: addresses.complement,
                neighborhood: addresses.neighborhood,
                city: addresses.city,
                state: addresses.state,
                country: addresses.country,
              })
              .from(addresses)
              .where(
                and(
                  eq(addresses.id, parsed.data.addressId),
                  eq(addresses.userId, user.id),
                ),
              )
              .for("share");
            const snapshot = addressSnapshotSchema.safeParse(address);
            if (!snapshot.success)
              return {
                success: false as const,
                code: "INVALID_ADDRESS" as const,
              };
            shippingAddress = snapshot.data;
          }
          if (parsed.data.payment?.method === "CARD") {
            const [card] = await tx
              .select({ last4: savedTestCards.last4 })
              .from(savedTestCards)
              .where(
                and(
                  eq(savedTestCards.id, parsed.data.payment.cardId),
                  eq(savedTestCards.userId, user.id),
                  sql`(${savedTestCards.expiryYear} * 12 + ${savedTestCards.expiryMonth}) >= (extract(year from clock_timestamp() at time zone 'UTC')::int * 12 + extract(month from clock_timestamp() at time zone 'UTC')::int)`,
                ),
              )
              .for("update");
            if (!card)
              return { success: false as const, code: "INVALID_CARD" as const };
            cardLast4 = card.last4;
          }
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
          const stocks = await tx
            .select({
              productId: inventory.productId,
              quantity: inventory.availableQuantity,
              revision: inventory.revision,
            })
            .from(inventory)
            .where(
              inArray(
                inventory.productId,
                items.map((item) => item.productId),
              ),
            )
            .orderBy(inventory.productId)
            .for("update");
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
              availableQuantity:
                stocks.find((stock) => stock.productId === product.productId)
                  ?.quantity ?? 0,
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
              shippingAddress,
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
          const status =
            parsed.data.payment && parsed.data.payment.method !== "CARD"
              ? "PENDING_PAYMENT"
              : simulatePayment({
                  status: order.status,
                  totalAmount: checked.snapshot.total.amount,
                });
          if (parsed.data.payment) {
            const pix = parsed.data.payment.method === "PIX";
            await tx.insert(orderPayments).values({
              orderId: order.orderId,
              method: parsed.data.payment.method,
              status:
                status === "PENDING_PAYMENT"
                  ? "PENDING"
                  : status === "PAID"
                    ? "APPROVED"
                    : "DECLINED",
              cardLast4,
              completedAt:
                status === "PENDING_PAYMENT" ? null : sql`clock_timestamp()`,
              approvableAt: sql`clock_timestamp() + ${parsed.data.payment.method === "CARD" ? 0 : pix ? 30 : 60} * interval '1 second'`,
              expiresAt: sql`clock_timestamp() + ${pix ? 600 : 86400} * interval '1 second'`,
            });
          }
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
            for (const item of checked.snapshot.items) {
              const changed = await tx
                .update(inventory)
                .set({
                  availableQuantity: sql`${inventory.availableQuantity} - ${item.quantity}`,
                  revision: sql`${inventory.revision} + 1`,
                })
                .where(
                  and(
                    eq(inventory.productId, item.productId),
                    sql`${inventory.availableQuantity} >= ${item.quantity}`,
                    sql`${inventory.revision} < 2147483647`,
                  ),
                )
                .returning({ productId: inventory.productId });
              if (!changed.length) throw inventoryConflict;
            }
          }
          if (status === "PAID" || status === "PENDING_PAYMENT") {
            // Pending asynchronous orders convert the cart now, never on later confirmation.
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
          if (status !== "PENDING_PAYMENT")
            await writeAuditEvent(tx, {
              eventType: "order.completed",
              outcome: status === "PAID" ? "SUCCESS" : "FAILED",
              actorUserId: user.id,
              targetType: "order",
              targetId: order.orderId,
            });
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
          if (
            parsed.data.payment?.method === "CARD" &&
            !(
              await tx
                .select({ id: savedTestCards.id })
                .from(savedTestCards)
                .where(
                  and(
                    eq(savedTestCards.id, parsed.data.payment.cardId),
                    eq(savedTestCards.userId, user.id),
                    sql`(${savedTestCards.expiryYear} * 12 + ${savedTestCards.expiryMonth}) >= (extract(year from clock_timestamp() at time zone 'UTC')::int * 12 + extract(month from clock_timestamp() at time zone 'UTC')::int)`,
                  ),
                )
                .limit(1)
            ).length
          )
            throw invalidCard;
          return { success: true as const, orderId: order.orderId, status };
        })
        .catch((error) => {
          failure = error;
          return null;
        });
    });
    if (result === null) throw failure;
    return result;
  } catch (error) {
    if (error === invalidCard)
      return { success: false as const, code: "INVALID_CARD" as const };
    if (error === expired)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    if (error === inventoryConflict)
      return { success: false as const, code: "CONFLICT" as const };
    orderFailure("create");
    throw new Error("Não foi possível concluir o checkout.");
  }
}
