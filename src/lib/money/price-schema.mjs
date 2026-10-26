import { z } from "zod";
export const priceSchema = z.strictObject({
  amount: z.number().int().min(1).max(2147483647),
  currency: z.literal("BRL"),
});
