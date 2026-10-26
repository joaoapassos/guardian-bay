import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, chown, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { atomicPrivateFile, configurationDirectory } from "./state.mjs";

export function createInstallationSecrets() {
  return {
    appPassword: randomBytes(36).toString("base64url"),
    migratorPassword: randomBytes(36).toString("base64url"),
    cpfKey: randomBytes(32).toString("base64"),
  };
}
export async function installationSecrets(directory = configurationDirectory) {
  const path = join(directory, "secrets.json");
  if (existsSync(path)) {
    let value;
    try {
      value = JSON.parse(await readFile(path, "utf8"));
    } catch {
      throw new Error(
        "Segredos inválidos; restaure backup. O conteúdo não será exibido.",
      );
    }
    if (
      !/^[\w-]{48}$/.test(value.appPassword ?? "") ||
      !/^[\w-]{48}$/.test(value.migratorPassword ?? "") ||
      Buffer.from(value.cpfKey ?? "", "base64").length !== 32
    )
      throw new Error(
        "Segredos incompletos; restaure backup sem gerar outra chave CPF.",
      );
    return value;
  }
  if (existsSync(join(directory, "runtime.env")))
    throw new Error("Secrets ausente com runtime existente; restaure backup.");
  const value = createInstallationSecrets();
  await atomicPrivateFile(path, `${JSON.stringify(value)}\n`);
  return value;
}
export function databaseUrl(role, password, port) {
  const url = new URL("postgresql://127.0.0.1/guardian_bay");
  url.username = role;
  url.password = password;
  url.port = String(port);
  return url.toString();
}
export function runtimeEnvironment(options, secrets) {
  return {
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl(
      "guardian_bay_app",
      secrets.appPassword,
      options.dbPort,
    ),
    DATABASE_POOL_MAX: "10",
    PRODUCT_MEDIA_DIR: "/var/lib/guardian-bay/media",
    GUARDIAN_LOCAL_DEMO: "1",
    SEED_STATE_DIR: "/var/lib/guardian-bay/seeds",
    BUYER_DATA_ACTIVE_KEY_ID: "local-v1",
    BUYER_DATA_KEYS: JSON.stringify({ "local-v1": secrets.cpfKey }),
  };
}
export function environmentFile(env) {
  const lines = Object.entries(env).map(([key, value]) => {
    if (typeof value !== "string" || /[\r\n']/.test(value))
      throw new Error("Valor de ambiente inválido.");
    return `${key}='${value}'`;
  });
  return `${lines.join("\n")}\n`;
}
export async function prepareEnvironment(
  options,
  secrets,
  { uid, gid, sourceOwner },
  directory = configurationDirectory,
) {
  const env = runtimeEnvironment(options, secrets);
  const runtime = join(directory, "runtime.env");
  if (!existsSync(runtime)) {
    await atomicPrivateFile(runtime, environmentFile(env));
  } else {
    const content = await readFile(runtime, "utf8");
    for (const key of [
      "DATABASE_URL",
      "PRODUCT_MEDIA_DIR",
      "BUYER_DATA_ACTIVE_KEY_ID",
      "BUYER_DATA_KEYS",
    ])
      if (!content.includes(`${key}='${env[key]}'`))
        throw new Error(
          "Ambiente existente difere dos segredos/configuração; não será sobrescrito.",
        );
  }
  await chmod(runtime, 0o600);
  await chown(runtime, uid, gid);
  const migrator = join(directory, "migrator.env");
  await atomicPrivateFile(
    migrator,
    environmentFile({
      MIGRATION_DATABASE_URL: databaseUrl(
        "guardian_bay_migrator",
        secrets.migratorPassword,
        options.dbPort,
      ),
    }),
  );
  const sourceEnv = join(options.sourceDir, ".env.local");
  if (!existsSync(sourceEnv)) {
    const localEnv = operatorEnvironment(options, env);
    await writeFile(sourceEnv, environmentFile(localEnv), {
      flag: "wx",
      mode: 0o600,
    });
    await chown(sourceEnv, sourceOwner.uid, sourceOwner.gid);
  }
  return env;
}

export function operatorEnvironment(options, env) {
  const { NODE_ENV: _nodeEnv, ...localEnv } = env;
  return { ...localEnv, SEED_STATE_DIR: join(options.sourceDir, "var/seeds") };
}
