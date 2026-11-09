import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema/audit-events";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";

const schema = z.strictObject({
  userId: z.uuid(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export async function readUserAudit(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const rows = await tx
        .select({
          id: auditEvents.id,
          event: auditEvents.eventType,
          outcome: auditEvents.outcome,
          actor: auditEvents.actorUserId,
          date: auditEvents.occurredAt,
        })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.targetType, "user"),
            eq(auditEvents.targetId, parsed.data.userId),
            inArray(auditEvents.eventType, [
              "admin.user.promoted",
              "admin.user.demoted",
              "admin.user.suspended",
              "admin.user.reactivated",
              "admin.user.sessions_revoked",
            ]),
          ),
        )
        .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
        .limit(21)
        .offset((parsed.data.page - 1) * 20);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return {
        success: true as const,
        page: parsed.data.page,
        hasNext: rows.length > 20 && parsed.data.page < 1000,
        events: rows
          .slice(0, 20)
          .map((row) => ({ ...row, date: row.date.toISOString() })),
      };
    });
  } catch {
    throw new Error("Não foi possível consultar a auditoria.");
  }
}
