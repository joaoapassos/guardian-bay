import { z } from "zod";
import { priceSchema } from "../../lib/money/price-schema.mjs";
export const productContentSchema = z.strictObject({
  name: z.string().max(240).trim().min(1).max(120),
  description: z.string().max(2000),
  ...priceSchema.shape,
});
