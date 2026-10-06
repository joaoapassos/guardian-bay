import { z } from "zod";
import { auditEventTypes, auditOutcomes, auditTargetTypes } from "./events";

export const auditInputSchema = z
  .strictObject({
    eventType: z.enum(auditEventTypes),
    outcome: z.enum(auditOutcomes),
    actorUserId: z.uuid().nullable(),
    targetType: z.enum(auditTargetTypes).nullable(),
    targetId: z.uuid().nullable(),
  })
  .refine((event) => {
    if (event.eventType === "auth.abuse.threshold_reached")
      return (
        event.outcome === "THRESHOLD_REACHED" &&
        event.actorUserId === null &&
        event.targetType === null &&
        event.targetId === null
      );
    if (!event.actorUserId || !event.targetId || !event.targetType)
      return false;
    if (event.eventType === "order.completed")
      return (
        event.targetType === "order" &&
        (event.outcome === "SUCCESS" || event.outcome === "FAILED")
      );
    if (event.outcome !== "SUCCESS") return false;
    if (event.eventType.startsWith("auth."))
      return (
        event.targetType === "user" && event.targetId === event.actorUserId
      );
    if (event.eventType.startsWith("admin.category."))
      return event.targetType === "category";
    if (event.eventType.startsWith("admin.product."))
      return event.targetType === "product";
    return event.targetType === "inventory";
  });
export type AuditInput = z.infer<typeof auditInputSchema>;
