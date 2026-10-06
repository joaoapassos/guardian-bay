import { describe, expect, it } from "vitest";
import { cartItemSchema, removeCartItemSchema } from "./cart-item";

const productId = "11111111-1111-4111-8111-111111111111";
describe("ECMSG-63: contratos sem autoridade client", () => {
  it("rejeita todos os campos comerciais/ownership extras", () => {
    for (const key of [
      "userId",
      "cartId",
      "ownerId",
      "price",
      "amount",
      "unitPrice",
      "currency",
      "subtotal",
      "total",
      "role",
      "isPublished",
      "revision",
    ]) {
      expect(
        cartItemSchema.safeParse({
          productId,
          quantity: 1,
          [key]: key === "currency" ? "USD" : 1,
        }).success,
      ).toBe(false);
      expect(
        removeCartItemSchema.safeParse({ productId, [key]: 1 }).success,
      ).toBe(false);
    }
  });
  it("quantidade limitada sem coerção, SQLi e inputs não finitos", () => {
    for (const quantity of [
      -1,
      0,
      0.5,
      "1",
      100,
      1e99,
      NaN,
      Infinity,
      undefined,
      null,
    ])
      expect(cartItemSchema.safeParse({ productId, quantity }).success).toBe(
        false,
      );
    expect(
      cartItemSchema.safeParse({ productId: "' OR 1=1 --", quantity: 1 })
        .success,
    ).toBe(false);
    expect(cartItemSchema.safeParse({ productId, quantity: 99 }).success).toBe(
      true,
    );
  });
});
