import { z } from "zod";

const pageNumber = z
  .string()
  .regex(/^[1-9]\d{0,3}$/)
  .transform(Number);

export const listQuerySchema = z.strictObject({
  page: pageNumber.pipe(z.number().max(1000)).optional().default(1),
  limit: pageNumber.pipe(z.number().max(50)).optional().default(20),
});
