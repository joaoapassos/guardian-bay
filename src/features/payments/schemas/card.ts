import { z } from "zod";

export const cardBrands = ["VISA", "MASTERCARD", "AMEX"] as const;
export type CardBrand = (typeof cardBrands)[number];

function issuer(number: string): CardBrand | null {
  if (/^4\d{12}(?:\d{3})?(?:\d{3})?$/.test(number)) return "VISA";
  if (/^3[47]\d{13}$/.test(number)) return "AMEX";
  if (number.length === 16) {
    const prefix = Number(number.slice(0, 4));
    if (/^5[1-5]/.test(number) || (prefix >= 2221 && prefix <= 2720))
      return "MASTERCARD";
  }
  return null;
}

function passesLuhn(number: string) {
  let sum = 0;
  for (
    let index = number.length - 1, position = 0;
    index >= 0;
    index--, position++
  ) {
    let digit = Number(number[index]);
    if (position % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const cardNumberSchema = z
  .string()
  .max(32, "Confira o número do cartão.")
  .refine((value) => value.length > 0 && !/[^0-9 -]/.test(value), {
    message: "Use apenas dígitos, espaços ou hífens.",
  })
  .transform((value) => value.replace(/[ -]/g, ""))
  .refine((value) => issuer(value) !== null && passesLuhn(value), {
    message: "Informe um número válido Visa, Mastercard ou American Express.",
  });

export function isCardExpired(month: number, year: number, now = new Date()) {
  return year * 12 + month < now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
}

export const cardInputSchema = z
  .strictObject({
    number: cardNumberSchema,
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(2000).max(2099),
  })
  .refine((value) => !isCardExpired(value.expiryMonth, value.expiryYear), {
    path: ["expiryYear"],
    message: "Informe uma validade atual ou futura.",
  });

export type CardInput = z.input<typeof cardInputSchema>;

export const cardExpirySchema = z
  .string()
  .length(7, "Informe o mês e o ano de validade.")
  .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Informe o mês e o ano de validade.")
  .refine(
    (value) =>
      !isCardExpired(Number(value.slice(5)), Number(value.slice(0, 4))),
    {
      message: "Informe uma validade atual ou futura.",
    },
  );

export const cardFormSchema = z
  .strictObject({
    number: cardNumberSchema,
    expiry: cardExpirySchema,
    cvv: z.string().regex(/^\d{3,4}$/, "Informe os 3 ou 4 dígitos do CVV."),
  })
  .refine(
    ({ number, cvv }) => cvv.length === (issuer(number) === "AMEX" ? 4 : 3),
    {
      path: ["cvv"],
      message: "Use 4 dígitos para American Express ou 3 para Visa/Mastercard.",
    },
  )
  .transform(({ number, expiry }) => ({
    number,
    expiryMonth: Number(expiry.slice(5)),
    expiryYear: Number(expiry.slice(0, 4)),
  }));

export type CardFormInput = z.input<typeof cardFormSchema>;
export type CardMetadata = {
  brand: CardBrand;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
};
export type PaymentMethodDto = CardMetadata & { id: string };

// This is the only projection of card input allowed beyond validation.
export function cardMetadata(input: unknown): CardMetadata {
  const parsed = cardInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Dados de cartão inválidos.");
  const brand = issuer(parsed.data.number);
  if (!brand) throw new Error("Dados de cartão inválidos.");
  return {
    brand,
    last4: parsed.data.number.slice(-4),
    expiryMonth: parsed.data.expiryMonth,
    expiryYear: parsed.data.expiryYear,
  };
}

export const checkoutCardPaymentSchema = z.union([
  z.strictObject({ method: z.literal("CARD"), paymentMethodId: z.uuid() }),
  z.strictObject({
    method: z.literal("CARD"),
    card: cardInputSchema,
    save: z.boolean().default(false),
  }),
]);
export const removePaymentMethodSchema = z.strictObject({ id: z.uuid() });
