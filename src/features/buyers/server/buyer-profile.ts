import "server-only";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { sessionValidity, tokenHash } from "@/features/auth/server/session";
import { sessionCookiePolicy } from "@/features/auth/server/session-cookie";
import { maskedCpf } from "../schemas/buyer";
export async function readBuyerProfile() {
  const hash = tokenHash(
    (await cookies()).get(sessionCookiePolicy().name)?.value,
  );
  if (!hash) return null;
  const [profile] = await getDb()
    .select({ name: users.name, cpfLast2: users.cpfLast2, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hash), sessionValidity()))
    .limit(1);
  return profile
    ? {
        name: profile.name,
        email: profile.email,
        cpfMask: profile.cpfLast2 ? maskedCpf(profile.cpfLast2) : null,
      }
    : null;
}
