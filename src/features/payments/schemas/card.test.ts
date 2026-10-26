import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cardInputSchema,
  cardMetadata,
  checkoutCardPaymentSchema,
  isCardExpired,
} from "./card";

const card = { number: "4111111111111111", expiryMonth: 12, expiryYear: 2099 };
afterEach(() => vi.useRealTimers());

describe("card input", () => {
  it.each([
    ["4111 1111-1111 1111", "VISA", "1111"],
    ["4222222222222", "VISA", "2222"],
    ["4000000000000000006", "VISA", "0006"],
    ["5555555555554444", "MASTERCARD", "4444"],
    ["2221000000000009", "MASTERCARD", "0009"],
    ["2720990000000007", "MASTERCARD", "0007"],
    ["378282246310005", "AMEX", "0005"],
  ])("normalizes supported number and projects metadata (%s)", (number, brand, last4) => {
    const result = cardInputSchema.parse({ ...card, number });
    expect(result.number).toMatch(/^\d+$/);
    expect(cardMetadata(result)).toEqual({
      brand,
      last4,
      expiryMonth: 12,
      expiryYear: 2099,
    });
  });

  it.each([
    "4111111111111112",
    "6011111111111117",
    "0000000000000000",
    "411111111111",
    "41111111111111111",
    "4111x11111111111",
    "４１１１１１１１１１１１１１１１",
    "4".repeat(1000),
    "",
    "4111111111111111\n",
  ])("rejects invalid/unsupported input %s", (number) => {
    expect(cardInputSchema.safeParse({ ...card, number }).success).toBe(false);
  });

  it("rejects coercion, invalid month/year and client authority", () => {
    for (const extra of [
      { cvv: "123" },
      { userId: "owner" },
      { brand: "VISA" },
      { bank: "Invented" },
    ])
      expect(cardInputSchema.safeParse({ ...card, ...extra }).success).toBe(
        false,
      );
    for (const fields of [
      { expiryMonth: 0 },
      { expiryMonth: 13 },
      { expiryMonth: 1.5 },
      { expiryMonth: "12" },
      { expiryYear: Infinity },
      { expiryYear: 2100 },
    ])
      expect(cardInputSchema.safeParse({ ...card, ...fields }).success).toBe(
        false,
      );
  });

  it("keeps the current UTC month valid through its last instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T23:59:59.999Z"));
    expect(
      cardInputSchema.safeParse({ ...card, expiryMonth: 10, expiryYear: 2026 })
        .success,
    ).toBe(true);
    expect(
      cardInputSchema.safeParse({ ...card, expiryMonth: 9, expiryYear: 2026 })
        .success,
    ).toBe(false);
    vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
    expect(isCardExpired(10, 2026)).toBe(true);
    expect(
      cardInputSchema.safeParse({ ...card, expiryMonth: 10, expiryYear: 2026 })
        .success,
    ).toBe(false);
  });

  it("does not expose PAN in the metadata result or validation error", () => {
    expect(Object.keys(cardMetadata(card)).sort()).toEqual(
      ["brand", "last4", "expiryMonth", "expiryYear"].sort(),
    );
    expect(JSON.stringify(cardMetadata(card))).not.toContain(card.number);
    expect(() => cardMetadata({ ...card, number: "4111111111111112" })).toThrow(
      "Dados de cartão inválidos.",
    );
  });
});

it("checkout separates a saved reference from one-time input with an explicit save choice", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  expect(
    checkoutCardPaymentSchema.parse({ method: "CARD", card }),
  ).toMatchObject({ save: false });
  expect(
    checkoutCardPaymentSchema.safeParse({ method: "CARD", card, save: true })
      .success,
  ).toBe(true);
  expect(
    checkoutCardPaymentSchema.safeParse({ method: "CARD", paymentMethodId: id })
      .success,
  ).toBe(true);
  for (const input of [
    { method: "CARD", card, paymentMethodId: id },
    { method: "CARD", paymentMethodId: id, save: true },
    { method: "CARD", paymentMethodId: id, status: "PAID" },
    { method: "CARD", card, save: "true" },
    { method: "CARD", cardId: id },
  ])
    expect(checkoutCardPaymentSchema.safeParse(input).success).toBe(false);
});
