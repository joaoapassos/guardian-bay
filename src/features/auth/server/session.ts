import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";

import { securityEvent } from "./security-event";

export function tokenHash(token: unknown): string | null {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}

// Shared by identity reads and protected queries; never client authority.
export function sessionValidity() {
  return and(
    sql`${sessions.expiresAt} > CURRENT_TIMESTAMP`,
    sql`${sessions.lastActiveAt} > CURRENT_TIMESTAMP - interval '30 minutes'`,
  );
}

// Call only at request mutations/Actions, never during Server Component render.
export async function recordSessionActivity(token: unknown) {
  const hash = tokenHash(token);
  if (!hash) return;
  try {
    await getDb()
      .update(sessions)
      .set({ lastActiveAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(sessions.tokenHash, hash),
          sessionValidity(),
          sql`${sessions.lastActiveAt} <= CURRENT_TIMESTAMP - interval '5 minutes'`,
        ),
      );
  } catch {
    securityEvent("session-activity", "OPERATION_FAILED");
    throw new Error("Não foi possível atualizar a sessão.");
  }
}

// Only privileged callers receive the raw token; the Action sends it as a cookie.
export async function createSession(userId: string, previousToken?: string) {
  const token = randomBytes(32).toString("hex");
  const hash = tokenHash(token) as string;
  const previousHash = tokenHash(previousToken);
  try {
    const session = await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(sessions)
        .values({
          tokenHash: hash,
          userId,
          expiresAt: sql`CURRENT_TIMESTAMP + interval '8 hours'`,
        })
        .returning({ expiresAt: sessions.expiresAt });
      if (previousHash)
        await tx.delete(sessions).where(eq(sessions.tokenHash, previousHash));
      return created;
    });
    return { token, expiresAt: session.expiresAt };
  } catch {
    securityEvent("session-create", "OPERATION_FAILED");
    throw new Error("Não foi possível processar a sessão.");
  }
}

export async function resolveSession(token: unknown) {
  const hash = tokenHash(token);
  if (!hash) return null;
  try {
    const [identity] = await getDb()
      .select({ id: users.id, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .limit(1);
    return identity ?? null;
  } catch {
    securityEvent("session-read", "OPERATION_FAILED");
    throw new Error("Não foi possível consultar a sessão.");
  }
}

export async function revokeSession(token: unknown) {
  const hash = tokenHash(token);
  if (!hash) return;
  try {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, hash));
  } catch {
    securityEvent("logout", "OPERATION_FAILED");
    throw new Error("Não foi possível revogar a sessão.");
  }
}
