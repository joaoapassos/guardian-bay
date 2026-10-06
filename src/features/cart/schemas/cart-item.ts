import { z } from "zod";

export const cartItemSchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});
