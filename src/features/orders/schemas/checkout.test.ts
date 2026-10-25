import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { checkoutSchema } from "./checkout";

it("ECMSG-76: intenção estrita rejeita autoridade comercial, ownership e status", () => {
  const input = { checkoutKey: randomUUID() };
  expect(checkoutSchema.safeParse(input).success).toBe(true);
  for (const key of [
    "userId",
    "orderId",
    "items",
    "unitPrice",
    "amount",
    "subtotal",
    "total",
    "currency",
    "status",
    "paymentStatus",
    "role",
    "snapshot",
  ])
    expect(checkoutSchema.safeParse({ ...input, [key]: 1 }).success).toBe(
      false,
    );
  for (const key of ["", "x".repeat(1000), "' OR 1=1 --", null, 1])
    expect(checkoutSchema.safeParse({ checkoutKey: key }).success).toBe(false);
});

it("accepts an optional address reference without accepting an address snapshot", () => {
  const checkoutKey = randomUUID();
  expect(checkoutSchema.safeParse({ checkoutKey }).success).toBe(true);
  expect(
    checkoutSchema.safeParse({ checkoutKey, addressId: randomUUID() }).success,
  ).toBe(true);
  for (const addressId of ["", "not-an-id", null, 1])
    expect(checkoutSchema.safeParse({ checkoutKey, addressId }).success).toBe(
      false,
    );
  expect(
    checkoutSchema.safeParse({
      checkoutKey,
      shippingAddress: { recipient: "Untrusted" },
    }).success,
  ).toBe(false);
});
