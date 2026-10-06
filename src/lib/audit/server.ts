import "server-only";
import { randomUUID } from "node:crypto";
import type { getDb } from "@/db";
import { auditEvents } from "@/db/schema/audit-events";
import { type AuditInput, auditInputSchema } from "./input";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
// Caller owns the transaction and the trusted actor/target. No nested transaction,
// public Action, arbitrary metadata, client correlation ID or raw error sink.
export async function writeAuditEvent(tx: Transaction, input: AuditInput) {
  const parsed = auditInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Evento de auditoria inválido.");
  await tx
    .insert(auditEvents)
    .values({ ...parsed.data, correlationId: randomUUID() });
}
