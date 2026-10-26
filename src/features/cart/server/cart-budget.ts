import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { abuseBudgets } from "@/db/schema/abuse-budgets";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export async function reserveCartWriteBudget(tx: Transaction, userId: string) {
  const table = abuseBudgets;
  const expired = sql`${table.expiresAt} <= clock_timestamp()`;
  const [accepted] = await tx
    .insert(table)
    .values({
      userId,
      operation: "cart.write",
      attempts: 1,
      startedAt: sql`clock_timestamp()`,
      lastAcceptedAt: sql`clock_timestamp()`,
      expiresAt: sql`clock_timestamp() + interval '60 seconds'`,
    })
    .onConflictDoUpdate({
      target: [table.userId, table.operation],
      set: {
        attempts: sql`CASE WHEN ${expired} THEN 1 ELSE ${table.attempts} + 1 END`,
        startedAt: sql`CASE WHEN ${expired} THEN clock_timestamp() ELSE ${table.startedAt} END`,
        expiresAt: sql`CASE WHEN ${expired} THEN clock_timestamp() + interval '60 seconds' ELSE ${table.expiresAt} END`,
        lastAcceptedAt: sql`clock_timestamp()`,
      },
      setWhere: sql`${expired} OR (${table.attempts} < 60 AND ${table.lastAcceptedAt} <= clock_timestamp() - interval '500 milliseconds')`,
    })
    .returning({ attempts: table.attempts });
  if (accepted) return { allowed: true as const };
  const [current] = await tx
    .select({
      retryAfterMs: sql<number>`greatest(1, ceil(extract(epoch from ((CASE WHEN ${table.attempts} >= 60 THEN ${table.expiresAt} ELSE ${table.lastAcceptedAt} + interval '500 milliseconds' END) - clock_timestamp())) * 1000))::int`,
    })
    .from(table)
    .where(and(eq(table.userId, userId), eq(table.operation, "cart.write")))
    .limit(1);
  return {
    allowed: false as const,
    retryAfterMs: current?.retryAfterMs ?? 500,
  };
}
