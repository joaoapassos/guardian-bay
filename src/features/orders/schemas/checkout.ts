import { z } from "zod";
export const checkoutSchema = z.strictObject({
  checkoutKey: z.uuid(),
  payment: z.strictObject({ method: z.enum(["PIX", "BOLETO"]) }).optional(),
});
