import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createOrderSnapshot } from "./order-snapshot";

const item = () => ({
  productId: randomUUID(),
  productName: "Snapshot name",
  quantity: 3,
  price: { amount: 1099, currency: "BRL" },
});
it("ECMSG-68: centavos, soma e snapshot independente do input", () => {
  const source = item();
  const result = createOrderSnapshot([
    source,
    { ...item(), quantity: 2, price: { amount: 1, currency: "BRL" } },
  ]);
  expect(result.total.amount).toBe(3299);
  source.productName = "Changed";
  source.price.amount = 2000;
  expect(result.items[0]).toMatchObject({
    productName: "Snapshot name",
    unitAmount: 1099,
    subtotalAmount: 3297,
  });
});
it("ECMSG-68: máximo exato acima de integer e abaixo de safe integer", () => {
  const result = createOrderSnapshot(
    Array.from({ length: 100 }, () => ({
      ...item(),
      quantity: 99,
      price: { amount: 2147483647, currency: "BRL" },
    })),
  );
  expect(result.total.amount).toBe(21260088105300);
  expect(Number.isSafeInteger(result.total.amount)).toBe(true);
});
it("ECMSG-68: rejeita vazio, duplicação, quantidade e dinheiro inválidos", () => {
  const source = item();
  for (const input of [
    [],
    [source, source],
    [{ ...source, quantity: 100 }],
    [{ ...source, quantity: 0 }],
    [{ ...source, price: { amount: 1.01, currency: "BRL" } }],
    [{ ...source, price: { amount: 1, currency: "USD" } }],
    [{ ...source, total: 1 }],
  ])
    expect(() => createOrderSnapshot(input)).toThrow();
});
