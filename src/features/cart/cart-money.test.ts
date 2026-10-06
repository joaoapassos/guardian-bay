import { describe, expect, it } from "vitest";
import { calculateCart } from "./cart-money";

const item = (amount: number, quantity = 1, available = true) => ({
  quantity,
  available,
  price: { amount, currency: "BRL" as const },
});
describe("ECMSG-59: Dinero do carrinho", () => {
  it("vazio, centavos e múltiplos itens exatos", () => {
    expect(calculateCart([]).total.amount).toBe(0);
    const cart = calculateCart([item(101, 3), item(299, 2)]);
    expect(cart.items.map((i) => i.subtotal?.amount)).toEqual([303, 598]);
    expect(cart.total.amount).toBe(901);
  });
  it("limite máximo permanece preciso acima de PostgreSQL integer", () => {
    expect(
      calculateCart(Array.from({ length: 100 }, () => item(2147483647, 99)))
        .total.amount,
    ).toBe(21260088105300);
  });
  it("indisponível não tem subtotal comercial nem participa do total", () => {
    const cart = calculateCart([item(100, 2), item(999, 99, false)]);
    expect(cart.total.amount).toBe(200);
    expect(cart.items[1].subtotal).toBeNull();
  });
  it("preço derivado vem do catálogo, e total forjado não participa", () => {
    expect(
      calculateCart([{ ...item(1099, 2), total: 1, unitPrice: 1 }]).total
        .amount,
    ).toBe(2198);
    expect(calculateCart([item(1299, 2)]).total.amount).toBe(2598);
  });
  it("rejeita limites e moeda incompatível", () => {
    expect(() => calculateCart([item(1, 100)])).toThrow();
    expect(() =>
      calculateCart(Array.from({ length: 101 }, () => item(1))),
    ).toThrow();
  });
});
