import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { checkoutSchema } from "./checkout";

it("ECMSG-76: intenção estrita rejeita autoridade comercial, ownership e status", () => {
  const input = {
    checkoutKey: randomUUID(),
    buyer: { source: "new", name: "Pessoa Teste", cpf: "52998224725" },
    addressId: randomUUID(),
  };
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

it("requires buyer identity and exactly one own reference or validated inline address", () => {
  const checkoutKey = randomUUID();
  const buyer = { source: "new", name: "Pessoa Teste", cpf: "52998224725" };
  expect(checkoutSchema.safeParse({ checkoutKey }).success).toBe(false);
  expect(
    checkoutSchema.safeParse({ checkoutKey, buyer, addressId: randomUUID() })
      .success,
  ).toBe(true);
  for (const addressId of ["", "not-an-id", null, 1])
    expect(
      checkoutSchema.safeParse({ checkoutKey, buyer, addressId }).success,
    ).toBe(false);
  expect(
    checkoutSchema.safeParse({
      checkoutKey,
      buyer,
      shippingAddress: { recipient: "Untrusted" },
    }).success,
  ).toBe(false);
  const address = {
    recipient: "Pessoa Teste",
    postalCode: "12345678",
    street: "Rua Teste",
    number: "10",
    complement: "",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    country: "BR",
  };
  expect(
    checkoutSchema.safeParse({
      checkoutKey,
      buyer,
      address,
      saveAddress: false,
    }).success,
  ).toBe(true);
  expect(
    checkoutSchema.safeParse({
      checkoutKey,
      buyer,
      address,
      addressId: randomUUID(),
    }).success,
  ).toBe(false);
  expect(
    checkoutSchema.safeParse({
      checkoutKey,
      buyer: { ...buyer, cpf: "11111111111" },
      address,
    }).success,
  ).toBe(false);
});
