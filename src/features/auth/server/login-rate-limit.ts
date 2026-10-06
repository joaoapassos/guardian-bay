import "server-only";
import { createHash } from "node:crypto";
import { and, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { loginRateLimits } from "@/db/schema/login-rate-limits";
import { emailSchema } from "../schemas/credential.schema";

import { securityEvent } from "./security-event";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function increment(
  tx: Transaction,
  key: string,
  limit: number,
  seconds: number,
) {
  const table = loginRateLimits;
  const expired = sql`${table.expiresAt} <= CURRENT_TIMESTAMP`;
  const [row] = await tx
    .insert(table)
    .values({
      key,
      attempts: 1,
      startedAt: sql`CURRENT_TIMESTAMP`,
      expiresAt: sql`CURRENT_TIMESTAMP + ${seconds} * interval '1 second'`,
    })
    .onConflictDoUpdate({
      target: table.key,
      set: {
        attempts: sql`CASE WHEN ${expired} THEN 1 ELSE ${table.attempts} + 1 END`,
        startedAt: sql`CASE WHEN ${expired} THEN CURRENT_TIMESTAMP ELSE ${table.startedAt} END`,
        expiresAt: sql`CASE WHEN ${expired} THEN CURRENT_TIMESTAMP + ${seconds} * interval '1 second' ELSE ${table.expiresAt} END`,
      },
      setWhere: sql`${expired} OR ${table.attempts} < ${limit}`,
    })
    .returning({ attempts: table.attempts });
  return row;
}

// No client-controlled IP header. Global budget also bounds identifier rotation.
export async function reserveLoginAttempt(email: unknown): Promise<boolean> {
  const input = emailSchema.safeParse(email);
  if (!input.success) return false;
  const key = `email:${createHash("sha256").update(input.data).digest("hex")}`;
  try {
    const reservation = await getDb().transaction(async (tx) => {
      const global = await increment(tx, "global", 20, 60);
      if (!global) return { allowed: false, thresholdReached: false };
      if (global.attempts === 1) {
        // Bounded cleanup once per global window; no timer or unbounded sweep.
        await tx.delete(loginRateLimits).where(
          inArray(
            loginRateLimits.key,
            tx
              .select({ key: loginRateLimits.key })
              .from(loginRateLimits)
              .where(
                and(
                  ne(loginRateLimits.key, "global"),
                  sql`${loginRateLimits.expiresAt} <= CURRENT_TIMESTAMP`,
                ),
              )
              .orderBy(loginRateLimits.expiresAt)
              .limit(100),
          ),
        );
      }
      const account = await increment(tx, key, 5, 900);
      return {
        allowed: Boolean(account),
        thresholdReached: global.attempts === 20 || account?.attempts === 5,
      };
    });
    if (reservation.thresholdReached) securityEvent("login", "LIMIT_REACHED");
    return reservation.allowed;
  } catch {
    securityEvent("login", "OPERATION_FAILED");
    throw new Error("Não foi possível processar a autenticação.");
  }
}

// Cross-process cap: advisory xact locks release on commit/rollback/disconnect.
// Namespace 1195524428 is reserved for this feature; never supplied by callers.
export async function withLoginHashSlot<T>(
  operation: (tx: Transaction) => Promise<T>,
) {
  try {
    return await getDb().transaction(async (tx) => {
      for (const slot of [0, 1]) {
        const [lock] = await tx.execute<{ acquired: boolean }>(
          sql`SELECT pg_try_advisory_xact_lock(1195524428, ${slot}) AS acquired`,
        );
        if (lock.acquired)
          return { admitted: true as const, value: await operation(tx) };
      }
      return { admitted: false as const };
    });
  } catch {
    securityEvent("login", "OPERATION_FAILED");
    throw new Error("Não foi possível processar a autenticação.");
  }
}
