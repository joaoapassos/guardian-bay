import { z } from "zod";

const paymentInput = z.strictObject({
  status: z.literal("PENDING_PAYMENT"),
  totalAmount: z.number().int().min(1).max(21260088105300),
});
// Academic rule only. No financial data or status supplied by the browser.
export function simulatePayment(input: unknown) {
  const payment = paymentInput.parse(input);
  return payment.totalAmount < 1_000_000
    ? ("PAID" as const)
    : ("PAYMENT_FAILED" as const);
}
