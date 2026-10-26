import type { z } from "zod";
export const priceSchema: z.ZodObject<{
  amount: z.ZodNumber;
  currency: z.ZodLiteral<"BRL">;
}>;
