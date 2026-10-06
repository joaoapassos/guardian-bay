import { z } from "zod";
import { auditEventTypes, auditOutcomes } from "@/lib/audit/events";

const positive = z
  .string()
  .regex(/^[1-9]\d{0,3}$/)
  .transform(Number);
const uuidFilter = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .default("");
export const auditQuerySchema = z.strictObject({
  eventType: z
    .union([z.enum(auditEventTypes), z.literal("")])
    .optional()
    .default(""),
  outcome: z
    .union([z.enum(auditOutcomes), z.literal("")])
    .optional()
    .default(""),
  actorUserId: uuidFilter,
  targetId: uuidFilter,
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  page: positive.pipe(z.number().max(1000)).optional().default(1),
  limit: positive.pipe(z.number().max(50)).optional().default(20),
});
