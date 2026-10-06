import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setInventorySchema } from "./set-inventory";

const input = { productId: randomUUID(), quantity: 0, revision: 1 };
it("ECMSG-89: quantidade/revisão inteiras finitas e limitadas", () => {
  for (const quantity of [-1, 0.5, NaN, Infinity, 2147483648, "1", null])
    expect(setInventorySchema.safeParse({ ...input, quantity }).success).toBe(
      false,
    );
  for (const revision of [0, -1, 0.5, NaN, Infinity, 2147483648, "1"])
    expect(setInventorySchema.safeParse({ ...input, revision }).success).toBe(
      false,
    );
  for (const quantity of [0, 2147483647])
    expect(setInventorySchema.safeParse({ ...input, quantity }).success).toBe(
      true,
    );
});
it("ECMSG-89: contrato rejeita autoridade adicional e SQLi-like", () => {
  for (const key of [
    "userId",
    "role",
    "price",
    "currency",
    "status",
    "paymentStatus",
    "orderId",
    "stockDelta",
    "inventoryId",
    "availableQuantity",
    "inStock",
  ])
    expect(setInventorySchema.safeParse({ ...input, [key]: 1 }).success).toBe(
      false,
    );
  expect(
    setInventorySchema.safeParse({ ...input, productId: "' OR 1=1 --" })
      .success,
  ).toBe(false);
});
