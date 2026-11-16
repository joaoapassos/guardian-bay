import { emailSchema } from "../../src/features/auth/credential-policy.mjs";

export function parseSimulationConfig(env) {
  try {
    const url = new URL(env.DATABASE_URL);
    const admin = emailSchema.parse(env.SIMULATION_ADMIN_EMAIL);
    const limit = env.SIMULATION_MAX_PER_TYPE ?? "10000";
    if (
      env.GUARDIAN_LOCAL_DEMO !== "1" ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" ||
      url.pathname !== "/guardian_bay" ||
      decodeURIComponent(url.username) !== "guardian_bay_app" ||
      !url.password ||
      url.search ||
      url.hash ||
      !/^\d+$/.test(limit)
    )
      throw new Error();
    const maxPerType = Number(limit);
    if (
      !Number.isSafeInteger(maxPerType) ||
      maxPerType < 1 ||
      maxPerType > 1_000_000
    )
      throw new Error();
    return { databaseUrl: url.toString(), adminEmail: admin, maxPerType };
  } catch {
    throw new Error("Configuração local de simulação inválida.");
  }
}
