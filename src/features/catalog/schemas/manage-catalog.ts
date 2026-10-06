import { z } from "zod";
import { priceSchema } from "@/lib/money/price";
import { imageKeySchema } from "../images";

const name = z.string().max(240).trim().min(1).max(120);
const categoryName = z.string().max(160).trim().min(1).max(80);
const productFields = {
  name,
  description: z.string().max(2000),
  categoryId: z.uuid(),
  amount: priceSchema.shape.amount,
  currency: priceSchema.shape.currency,
  isPublished: z.boolean(),
  imageKey: imageKeySchema.nullable().optional().default(null),
};
const revision = z.number().int().min(1).max(2_147_483_646);
export const manageCatalogSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    operation: z.literal("create-category"),
    name: categoryName,
  }),
  z.strictObject({
    operation: z.literal("update-category"),
    id: z.uuid(),
    revision,
    name: categoryName,
  }),
  z.strictObject({ operation: z.literal("create-product"), ...productFields }),
  z.strictObject({
    operation: z.literal("update-product"),
    id: z.uuid(),
    revision,
    ...productFields,
  }),
]);
