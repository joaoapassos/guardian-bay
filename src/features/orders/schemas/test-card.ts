import { z } from "zod";

export const saveTestCardSchema = z.strictObject({
  fixtureId: z.enum(["test-1", "test-2", "test-3"]),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2026).max(2099),
});
export const removeTestCardSchema = z.strictObject({ cardId: z.uuid() });
