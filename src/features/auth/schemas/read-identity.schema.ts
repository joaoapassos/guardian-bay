import { z } from "zod";

export const readIdentitySchema = z.strictObject({
  userId: z.uuid().toLowerCase(),
});
