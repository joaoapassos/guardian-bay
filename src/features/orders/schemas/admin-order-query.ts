import { z } from "zod";

const positive = z
  .string()
  .regex(/^[1-9]\d{0,3}$/)
  .transform(Number);
export const adminOrderQuerySchema = z.strictObject({
  page: positive.pipe(z.number().max(1000)).optional().default(1),
  limit: positive.pipe(z.number().max(50)).optional().default(20),
  sort: z
    .enum(["created-desc", "created-asc"])
    .optional()
    .default("created-desc"),
});
