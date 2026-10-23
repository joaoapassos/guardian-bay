import { expect, it } from "vitest";
import { simulatedPaymentCode } from "./simulated-payment-code";

it("codes are explicitly non-bank text without keys, URLs or numeric bank payloads", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  expect(simulatedPaymentCode("PIX", id)).toBe(
    `GUARDIAN-BAY-SIMULACAO:PIX:${id}`,
  );
  expect(simulatedPaymentCode("BOLETO", id)).toBe(`SIMULACAO-BOLETO-${id}`);
  expect(() => simulatedPaymentCode("PIX", "https://example.com")).toThrow();
});
