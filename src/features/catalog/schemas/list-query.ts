import { z } from "zod";

const pageNumber = z
  .string()
  .regex(/^[1-9]\d{0,3}$/)
  .transform(Number);

export const listQuerySchema = z.strictObject({
  query: z.string().max(100).trim().optional().default(""),
  category: z
    .union([z.uuid(), z.literal("").transform(() => undefined)])
    .optional(),
  sort: z.enum(["name", "price-asc", "price-desc"]).optional().default("name"),
  page: pageNumber.pipe(z.number().max(1000)).optional().default(1),
  limit: pageNumber.pipe(z.number().max(50)).optional().default(20),
});
