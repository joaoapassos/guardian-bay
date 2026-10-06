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
