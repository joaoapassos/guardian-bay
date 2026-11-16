import { z } from "zod";
import { optionalNameSchema } from "@/features/buyers/schemas/buyer";
import { emailSchema, registrationPasswordSchema } from "./credential.schema";

export const adminUserEditSchema = z.strictObject({
  userId: z.uuid(),
  name: optionalNameSchema,
  email: emailSchema,
  password: z.union([z.literal(""), registrationPasswordSchema]),
});
