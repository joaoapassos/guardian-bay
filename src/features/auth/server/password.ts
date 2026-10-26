import "server-only";

import { hash, verify } from "argon2";
import { passwordHashOptions } from "../password-hash-policy.mjs";
import {
  authenticationPasswordSchema,
  passwordSchema,
} from "../schemas/credential.schema";

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
