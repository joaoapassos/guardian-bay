import { z } from "zod";
export const checkoutSchema = z.strictObject({
  checkoutKey: z.uuid(),
  payment: z
    .discriminatedUnion("method", [
      z.strictObject({ method: z.literal("CARD"), cardId: z.uuid() }),
      z.strictObject({ method: z.enum(["PIX", "BOLETO"]) }),
    ])
    .optional(),
});
