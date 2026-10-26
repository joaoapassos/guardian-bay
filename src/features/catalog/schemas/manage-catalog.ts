import { z } from "zod";
import { imageKeySchema } from "../images";
import { productContentSchema } from "../product-content.mjs";

const categoryName = z.string().max(160).trim().min(1).max(80);
const productFields = {
  ...productContentSchema.shape,
  categoryId: z.uuid(),
  isPublished: z.boolean(),
  imageKey: imageKeySchema.nullable().optional().default(null),
  mediaId: z.uuid().nullable().optional().default(null),
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
