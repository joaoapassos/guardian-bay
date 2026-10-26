import type { z } from "zod";
export const emailSchema: z.ZodPipe<
  z.ZodString,
  z.ZodPipe<z.ZodString, z.ZodString>
>;
export const authenticationPasswordSchema: z.ZodPipe<z.ZodString, z.ZodString>;
