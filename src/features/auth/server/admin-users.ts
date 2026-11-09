import "server-only";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { writeAuditEvent } from "@/lib/audit/server";
import {
  adminUserChangeSchema,
  adminUserQuerySchema,
} from "../schemas/admin-users.schema";
import { createAdminUserCache } from "./admin-user-cache";
import { requireAuthenticatedAdmin } from "./require-admin";

type ListedUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  suspended: boolean;
};
const userListCache = createAdminUserCache<ListedUser[]>();

export async function adminUserDetail(input: unknown) {
  const id = z.uuid().safeParse(input);
  if (!id.success)
    return { success: false as const, code: "NOT_FOUND" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const [user] = await tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          suspended: users.suspended,
        })
        .from(users)
        .where(eq(users.id, id.data))
        .limit(1);
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      if (!user) return { success: false as const, code: "NOT_FOUND" as const };
      return {
        success: true as const,
        user: { ...user, createdAt: user.createdAt.toISOString() },
        actorId: auth.identity.id,
      };
    });
  } catch {
    throw new Error("Não foi possível consultar o usuário.");
  }
}

export async function listAdminUsers(input: unknown) {
  const query = adminUserQuerySchema.safeParse(input);
  if (!query.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    return await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      const rows = await userListCache.get(
        JSON.stringify(query.data),
        async () => {
          const escaped = query.data.search.replace(/[\\%_]/g, "\\$&");
          const pattern = `%${escaped}%`;
          const direction = query.data.sort === "oldest" ? asc : desc;
          const rows = await tx
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
              createdAt: users.createdAt,
              suspended: users.suspended,
            })
            .from(users)
            .where(
              and(
                query.data.role ? eq(users.role, query.data.role) : undefined,
                query.data.status
                  ? eq(users.suspended, query.data.status === "suspended")
                  : undefined,
                query.data.search
                  ? or(
                      sql`${users.name} ILIKE ${pattern} ESCAPE '\\'`,
                      sql`${users.email} ILIKE ${pattern} ESCAPE '\\'`,
                    )
                  : undefined,
              ),
            )
            .orderBy(direction(users.createdAt), direction(users.id))
            .limit(21)
            .offset((query.data.page - 1) * 20);
          return rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          }));
        },
      );
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      return {
        success: true as const,
        users: rows.slice(0, 20),
        hasNext: rows.length > 20 && query.data.page < 1000,
        query: query.data,
        actorId: auth.identity.id,
      };
    });
  } catch {
    throw new Error("Não foi possível consultar usuários.");
  }
}

export async function changeAdminUserRole(input: unknown) {
  const parsed = adminUserChangeSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    const result = await getDb().transaction(async (tx) => {
      // Serializes role changes before taking identity locks, protecting the last admin.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1195521365, 1)`);
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      if (auth.identity.id === parsed.data.userId)
        return { success: false as const, code: "SELF" as const };
      const [target] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .for("update");
      if (!target)
        return { success: false as const, code: "NOT_FOUND" as const };
      if (target.role === parsed.data.role) return { success: true as const };
      if (target.role === "admin" && parsed.data.role === "customer") {
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.suspended, false)))
          .limit(2);
        if (admins.length < 2)
          return { success: false as const, code: "LAST_ADMIN" as const };
      }
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      await tx
        .update(users)
        .set({ role: parsed.data.role })
        .where(eq(users.id, target.id));
      await tx.delete(sessions).where(eq(sessions.userId, target.id));
      await writeAuditEvent(tx, {
        eventType:
          parsed.data.role === "admin"
            ? "admin.user.promoted"
            : "admin.user.demoted",
        outcome: "SUCCESS",
        actorUserId: auth.identity.id,
        targetType: "user",
        targetId: target.id,
      });
      return { success: true as const };
    });
    if (result.success) userListCache.clear();
    return result;
  } catch {
    throw new Error("Não foi possível alterar o cargo.");
  }
}

export async function manageAdminUser(input: unknown) {
  const parsed = z
    .strictObject({
      userId: z.uuid(),
      operation: z.enum(["suspend", "reactivate", "revoke"]),
    })
    .safeParse(input);
  if (!parsed.success)
    return { success: false as const, code: "INVALID_INPUT" as const };
  try {
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1195521365, 1)`);
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success) return auth;
      if (auth.identity.id === parsed.data.userId)
        return { success: false as const, code: "SELF" as const };
      const [target] = await tx
        .select({ id: users.id, role: users.role, suspended: users.suspended })
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .for("update");
      if (!target)
        return { success: false as const, code: "NOT_FOUND" as const };
      if (
        parsed.data.operation === "suspend" &&
        !target.suspended &&
        target.role === "admin"
      ) {
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.suspended, false)))
          .limit(2);
        if (admins.length < 2)
          return { success: false as const, code: "LAST_ADMIN" as const };
      }
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success) return fresh;
      if (parsed.data.operation === "suspend" && !target.suspended)
        await tx
          .update(users)
          .set({ suspended: true })
          .where(eq(users.id, target.id));
      if (parsed.data.operation === "reactivate" && target.suspended)
        await tx
          .update(users)
          .set({ suspended: false })
          .where(eq(users.id, target.id));
      if (
        parsed.data.operation === "suspend" ||
        parsed.data.operation === "revoke"
      )
        await tx.delete(sessions).where(eq(sessions.userId, target.id));
      if (
        parsed.data.operation === "revoke" ||
        target.suspended !== (parsed.data.operation === "suspend")
      )
        await writeAuditEvent(tx, {
          eventType:
            parsed.data.operation === "suspend"
              ? "admin.user.suspended"
              : parsed.data.operation === "reactivate"
                ? "admin.user.reactivated"
                : "admin.user.sessions_revoked",
          outcome: "SUCCESS",
          actorUserId: auth.identity.id,
          targetType: "user",
          targetId: target.id,
        });
      return { success: true as const };
    });
    if (result.success) userListCache.clear();
    return result;
  } catch {
    throw new Error("Não foi possível atualizar a conta.");
  }
}
