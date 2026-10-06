import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema/users";
import { authenticationCredentialSchema } from "../schemas/credential.schema";
import { verifyPassword } from "./password";

// Non-secret synthetic credential with the same versioned cost as real hashes.
const dummyHash =
  "$argon2id$v=19$m=65536,p=1,t=3$bhYjafBcHUUmsWMBUNxYfA$fEppDgrktjg68P24prq7BJBQLkDMXAN0DBmHPWEGBhw";

export async function authenticate(
  input: unknown,
  database?: Pick<ReturnType<typeof getDb>, "select">,
): Promise<string | null> {
  const parsed = authenticationCredentialSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const [user] = await (database ?? getDb())
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    const valid = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? dummyHash,
    );
    return user && valid ? user.id : null;
  } catch {
    throw new Error("Não foi possível processar a autenticação.");
  }
}
