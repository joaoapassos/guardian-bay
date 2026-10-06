import "server-only";

import { argon2id, hash, verify } from "argon2";
import {
  authenticationPasswordSchema,
  passwordSchema,
} from "../schemas/credential.schema";

// Versioned server policy: callers cannot supply cost, salt or algorithm.
const passwordHashOptions = Object.freeze({
  type: argon2id,
  version: 0x13,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
});

export async function hashPassword(password: unknown): Promise<string> {
  const input = passwordSchema.safeParse(password);
  if (!input.success) {
    throw new Error("Credencial inválida.");
  }

  try {
    return await hash(input.data, passwordHashOptions);
  } catch {
    throw new Error("Não foi possível processar a credencial.");
  }
}

// passwordHash must come from privileged persistence, never from the browser.
export async function verifyPassword(
  password: unknown,
  passwordHash: string,
): Promise<boolean> {
  const input = authenticationPasswordSchema.safeParse(password);
  if (!input.success) {
    return false;
  }

  try {
    if (
      typeof passwordHash !== "string" ||
      passwordHash.length > 512 ||
      !passwordHash.startsWith("$argon2id$v=19$")
    ) {
      throw new Error();
    }
    return await verify(passwordHash, input.data);
  } catch {
    throw new Error("Não foi possível processar a credencial.");
  }
}
