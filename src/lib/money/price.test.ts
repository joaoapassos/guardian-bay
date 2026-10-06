import { describe, expect, it } from "vitest";
import { priceDto } from "./price";

describe("preço BRL em centavos", () => {
  it.each([
    [1, "R$ 0,01"],
    [100, "R$ 1,00"],
    [1099, "R$ 10,99"],
    [2_147_483_647, "R$ 21.474.836,47"],
  ])("preserva %i centavos na apresentação", (amount, formatted) => {
    const result = priceDto({ amount, currency: "BRL" });
    expect(result.amount).toBe(amount);
    expect(result.currency).toBe("BRL");
    expect(result.formatted.replaceAll("\u00a0", " ")).toBe(formatted);
    expect(Object.keys(result)).toEqual(["amount", "currency", "formatted"]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it.each([
    0,
    -1,
    10.99,
    1.001,
    2_147_483_648,
    Number.MAX_SAFE_INTEGER,
    NaN,
    Infinity,
    "1099",
  ])("rejeita amount inválido sem arredondamento: %s", (amount) => {
    expect(() => priceDto({ amount, currency: "BRL" })).toThrow(
      "Preço inválido.",
    );
  });

  it.each([
    { amount: 1099, currency: "USD" },
    { amount: 1099 },
    { amount: 1099, currency: "BRL", formatted: "R$ 0,01" },
    null,
  ])("rejeita moeda e campos inesperados", (input) => {
    expect(() => priceDto(input)).toThrow("Preço inválido.");
  });
});
