import { add, dinero, multiply, toDecimal } from "dinero.js";
import { BRL } from "dinero.js/currencies";
import { z } from "zod";

export const priceSchema = z.strictObject({
  amount: z.number().int().min(1).max(2_147_483_647),
  currency: z.literal("BRL"),
});

const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function priceDto(input: unknown) {
  const parsed = priceSchema.safeParse(input);
  if (!parsed.success) throw new Error("Preço inválido.");

  return moneyDto(parsed.data.amount);
}

// Derived amounts may exceed PostgreSQL integer, but must remain exact integers.
export function moneyDto(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Valor monetário inválido.");
  const value = dinero({ amount, currency: BRL });
  const [units, fraction] = toDecimal(value).split(".");
  const formatted = formatter
    .formatToParts(BigInt(units))
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
  return { amount, currency: "BRL" as const, formatted };
}

export function multiplyPrice(input: unknown, quantity: number) {
  const price = priceSchema.parse(input);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99)
    throw new Error("Quantidade inválida.");
  const value = multiply(
    dinero({ amount: price.amount, currency: BRL }),
    quantity,
  );
  return moneyDto(value.toJSON().amount);
}

export function sumMoney(amounts: number[]) {
  let value = dinero({ amount: 0, currency: BRL });
  for (const amount of amounts) {
    moneyDto(amount);
    value = add(value, dinero({ amount, currency: BRL }));
    if (!Number.isSafeInteger(value.toJSON().amount))
      throw new Error("Valor monetário inválido.");
  }
  return moneyDto(value.toJSON().amount);
}
