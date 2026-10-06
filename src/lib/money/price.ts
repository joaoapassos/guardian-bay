import { dinero, toDecimal } from "dinero.js";
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

  const { amount, currency } = parsed.data;
  const value = dinero({ amount, currency: BRL });
  const [units, fraction] = toDecimal(value).split(".");
  const formatted = formatter
    .formatToParts(BigInt(units))
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");

  return { amount, currency, formatted };
}
