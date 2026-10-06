import { expect, it } from "vitest";
import { simulatePayment } from "./simulated-payment";

it("ECMSG-71: transição determinística somente de pending", () => {
  expect(
    simulatePayment({ status: "PENDING_PAYMENT", totalAmount: 999999 }),
  ).toBe("PAID");
  expect(
    simulatePayment({ status: "PENDING_PAYMENT", totalAmount: 1000000 }),
  ).toBe("PAYMENT_FAILED");
  for (const status of ["PAID", "PAYMENT_FAILED", "SHIPPED"])
    expect(() => simulatePayment({ status, totalAmount: 1 })).toThrow();
  expect(() =>
    simulatePayment({
      status: "PENDING_PAYMENT",
      totalAmount: 1,
      paymentStatus: "PAID",
    }),
  ).toThrow();
});
