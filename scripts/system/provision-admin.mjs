import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "argon2";
import postgres from "postgres";
import {
  authenticationPasswordSchema,
  emailSchema,
} from "../../src/features/auth/credential-policy.mjs";
import { passwordHashOptions } from "../../src/features/auth/password-hash-policy.mjs";

export async function provisionInitialAdmin(sql, input) {
  const email = emailSchema.parse(input.email);
  if (input.mode === "inspect") {
    const [user] = await sql`SELECT id,role FROM users WHERE email=${email}`;
    return { success: true, user: user ?? null };
  }
  if (
    input.mode !== "create" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      input.id ?? "",
    )
  )
    throw new Error("INVALID_INPUT");
  const password = authenticationPasswordSchema.parse(input.password);
  input.password = "";
  const passwordHash = await hash(password, passwordHashOptions);
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('guardian-bay:initial-admin'))`;
    const [existing] =
      await tx`SELECT id FROM users WHERE email=${email} FOR UPDATE`;
    if (existing) return { success: false, code: "EXISTS" };
    const [user] =
      await tx`INSERT INTO users(id,email,password_hash,role) VALUES (${input.id},${email},${passwordHash},'admin') RETURNING id`;
    return { success: true, id: user.id };
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let sql;
  try {
    let raw = "";
    for await (const chunk of process.stdin) {
      raw += chunk;
      if (raw.length > 4096) throw new Error("INPUT_LIMIT");
    }
    const input = JSON.parse(raw);
    raw = "";
    const url = new URL(process.env.MIGRATION_DATABASE_URL ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.pathname !== "/guardian_bay" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error("INVALID_TARGET");
    sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
    const result = await provisionInitialAdmin(sql, input);
    console.log(JSON.stringify(result));
    if (!result.success) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({ success: false, code: "PROVISION_FAILED" }));
    process.exitCode = 1;
  } finally {
    await sql?.end();
  }
}
