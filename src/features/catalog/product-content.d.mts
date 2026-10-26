import type { z } from "zod";
export const productContentSchema: z.ZodObject<{
  name: z.ZodString;
  description: z.ZodString;
  amount: z.ZodNumber;
  currency: z.ZodLiteral<"BRL">;
}>;
