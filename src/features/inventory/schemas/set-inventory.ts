import { z } from "zod";
export const setInventorySchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(0).max(2_147_483_647),
  revision: z.number().int().min(1).max(2_147_483_647),
});
