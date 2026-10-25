import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { addresses } from "@/db/schema/addresses";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import {
  addressReferenceSchema,
  addressSnapshotSchema,
  updateAddressSchema,
} from "../schemas/address";

const expired = Symbol("expired-session");
const failure = (
  code: "INVALID_INPUT" | "UNAUTHENTICATED" | "CONFLICT" | "LIMIT_REACHED",
) => ({ success: false as const, code });
export async function mutateAddress(
  operation: "create" | "update" | "remove",
  input: unknown,
) {
  const schema =
    operation === "create"
      ? addressSnapshotSchema
      : operation === "update"
        ? updateAddressSchema
        : addressReferenceSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure("INVALID_INPUT");
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash) return failure("UNAUTHENTICATED");
  try {
    return await getDb().transaction(async (tx) => {
      const [candidate] = await tx
        .select({ id: sessions.userId })
        .from(sessions)
        .where(eq(sessions.tokenHash, hash))
        .limit(1);
      if (!candidate) return failure("UNAUTHENTICATED");
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, candidate.id))
        .for("update");
      if (!user) return failure("UNAUTHENTICATED");
      const valid = () =>
        and(
          eq(sessions.tokenHash, hash),
          eq(sessions.userId, user.id),
          sql`${sessions.expiresAt} > clock_timestamp()`,
          sql`${sessions.lastActiveAt} > clock_timestamp() - interval '30 minutes'`,
        );
      const [session] = await tx
        .select({ id: sessions.userId })
        .from(sessions)
        .where(valid())
        .for("update");
      if (!session) return failure("UNAUTHENTICATED");
      if (operation === "create") {
        const existing = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(eq(addresses.userId, user.id))
          .limit(20);
        if (existing.length >= 20) return failure("LIMIT_REACHED");
        await tx.insert(addresses).values({
          ...addressSnapshotSchema.parse(parsed.data),
          userId: user.id,
        });
      } else {
        const reference = addressReferenceSchema.parse({
          id: "id" in parsed.data ? parsed.data.id : undefined,
          revision:
            "revision" in parsed.data ? parsed.data.revision : undefined,
        });
        const own = and(
          eq(addresses.userId, user.id),
          eq(addresses.id, reference.id),
          eq(addresses.revision, reference.revision),
        );
        const [previous] = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(own)
          .for("update");
        if (!previous) return failure("CONFLICT");
        if (operation === "remove") await tx.delete(addresses).where(own);
        else {
          const {
            id: _id,
            revision: _revision,
            ...fields
          } = updateAddressSchema.parse(parsed.data);
          await tx
            .update(addresses)
            .set({ ...fields, revision: reference.revision + 1 })
            .where(own);
        }
      }
      if (
        !(
          await tx
            .select({ id: sessions.userId })
            .from(sessions)
            .where(valid())
            .limit(1)
        ).length
      )
        throw expired;
      return { success: true as const };
    });
  } catch (error) {
    if (error === expired) return failure("UNAUTHENTICATED");
    throw new Error("Não foi possível salvar os endereços.");
  }
}
