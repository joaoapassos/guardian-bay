import { z } from "zod";
export function simulatedPaymentCode(
  method: "PIX" | "BOLETO",
  reference: string,
) {
  return method === "PIX"
    ? `GUARDIAN-BAY-SIMULACAO:PIX:${z.uuid().parse(reference)}`
    : `SIMULACAO-BOLETO-${z.uuid().parse(reference)}`;
}
