import { z } from "zod";
export const confirmPaymentSchema = z.strictObject({ orderId: z.uuid() });
