import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { getDb } from "@/db";
import { abuseBudgets } from "@/db/schema/abuse-budgets";
import { abuseLimits, abuseOperations, abuseWindowSeconds } from "./policy";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
const inputSchema = z.strictObject({
  userId: z.uuid(),
  operation: z.enum(abuseOperations),
});
// The authenticated caller resolves userId, owns the transaction and persists
// this reservation even when its subsequent business savepoint rolls back.
export async function reserveAbuseBudget(
  tx: Transaction,
  userId: string,
  operation: (typeof abuseOperations)[number],
) {
  const input = inputSchema.safeParse({ userId, operation });
  if (!input.success) throw new Error("Operação de proteção inválida.");
  const table = abuseBudgets;
  const limit = abuseLimits[input.data.operation];
  const expired = sql`${table.expiresAt} <= clock_timestamp()`;
  const [row] = await tx
    .insert(table)
    .values({
      userId: input.data.userId,
      operation: input.data.operation,
      attempts: 1,
      startedAt: sql`clock_timestamp()`,
      expiresAt: sql`clock_timestamp() + ${abuseWindowSeconds} * interval '1 second'`,
    })
    .onConflictDoUpdate({
      target: [table.userId, table.operation],
      set: {
        attempts: sql`CASE WHEN ${expired} THEN 1 ELSE ${table.attempts} + 1 END`,
        startedAt: sql`CASE WHEN ${expired} THEN clock_timestamp() ELSE ${table.startedAt} END`,
        expiresAt: sql`CASE WHEN ${expired} THEN clock_timestamp() + ${abuseWindowSeconds} * interval '1 second' ELSE ${table.expiresAt} END`,
      },
      setWhere: sql`${expired} OR ${table.attempts} < ${limit}`,
    })
    .returning({ attempts: table.attempts });
  return Boolean(row);
}
