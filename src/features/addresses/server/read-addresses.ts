import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { addresses } from "@/db/schema/addresses";
import { sessions } from "@/db/schema/sessions";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { type AddressDto, addressSnapshotSchema } from "../schemas/address";

export async function readAddresses() {
  const store = await cookies();
  const hash = tokenHash(store.get(sessionCookiePolicy().name)?.value);
  if (!hash)
    return { success: false as const, code: "UNAUTHENTICATED" as const };
  try {
    const rows = await getDb()
      .select({
        id: addresses.id,
        revision: addresses.revision,
        recipient: addresses.recipient,
        postalCode: addresses.postalCode,
        street: addresses.street,
        number: addresses.number,
        complement: addresses.complement,
        neighborhood: addresses.neighborhood,
        city: addresses.city,
        state: addresses.state,
        country: addresses.country,
      })
      .from(sessions)
      .leftJoin(addresses, eq(addresses.userId, sessions.userId))
      .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
      .orderBy(addresses.id)
      .limit(20);
    if (!rows.length)
      return { success: false as const, code: "UNAUTHENTICATED" as const };
    const result: AddressDto[] = rows.flatMap(({ id, revision, ...fields }) =>
      id && revision
        ? [{ id, revision, ...addressSnapshotSchema.parse(fields) }]
        : [],
    );
    return { success: true as const, addresses: result };
  } catch {
    throw new Error("Não foi possível consultar os endereços.");
  }
}
export const readCheckoutAddresses = readAddresses;
