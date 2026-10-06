import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema/audit-events";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { auditQuerySchema } from "../schemas/audit-query";

export async function readAudit(input: unknown = {}) {
  const query = auditQuerySchema.safeParse(input);
  if (!query.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const direction = query.data.sort === "oldest" ? asc : desc;
      const rows = await tx
        .select({
          eventId: auditEvents.id,
          occurredAt: auditEvents.occurredAt,
          eventType: auditEvents.eventType,
          outcome: auditEvents.outcome,
          actorUserId: auditEvents.actorUserId,
          targetType: auditEvents.targetType,
          targetId: auditEvents.targetId,
        })
        .from(auditEvents)
        .where(
          and(
            query.data.eventType
              ? eq(auditEvents.eventType, query.data.eventType)
              : undefined,
            query.data.outcome
              ? eq(auditEvents.outcome, query.data.outcome)
              : undefined,
            query.data.actorUserId
              ? eq(auditEvents.actorUserId, query.data.actorUserId)
              : undefined,
            query.data.targetId
              ? eq(auditEvents.targetId, query.data.targetId)
              : undefined,
          ),
        )
        .orderBy(direction(auditEvents.occurredAt), direction(auditEvents.id))
        .limit(query.data.limit + 1)
        .offset((query.data.page - 1) * query.data.limit);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return {
        success: true as const,
        query: query.data,
        hasNext: rows.length > query.data.limit && query.data.page < 1000,
        events: rows
          .slice(0, query.data.limit)
          .map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
      };
    });
  } catch {
    try {
      console.warn({
        operation: "audit.list",
        event: "audit",
        result: "OPERATION_FAILED",
        correlationId: randomUUID(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      /* best effort */
    }
    throw new Error("Não foi possível consultar a auditoria.");
  }
}
