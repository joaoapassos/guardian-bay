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

const decimalPrice = z
  .string()
  .regex(/^\d{1,8}(?:[.,]\d{1,2})?$/)
  .transform((value) => {
    const [whole, fraction = ""] = value.replace(",", ".").split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .pipe(z.number().int().min(0).max(2_147_483_647));
const optionalPrice = z
  .union([z.literal("").transform(() => undefined), decimalPrice])
  .optional();
export const publicListQuerySchema = listQuerySchema
  .extend({
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    availability: z.enum(["all", "in-stock"]).optional().default("all"),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "O preço mínimo deve ser menor ou igual ao máximo.",
      path: ["maxPrice"],
    },
  );
