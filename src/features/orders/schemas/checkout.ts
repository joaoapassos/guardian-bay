import { z } from "zod";
export const checkoutSchema = z.strictObject({ checkoutKey: z.uuid() });
