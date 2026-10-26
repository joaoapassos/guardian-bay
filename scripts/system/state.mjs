import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const configurationDirectory = "/etc/guardian-bay";
export async function atomicPrivateFile(path, content) {
  await writeFile(`${path}.tmp`, content, { mode: 0o600 });
  await chmod(`${path}.tmp`, 0o600);
  await rename(`${path}.tmp`, path);
}
export async function loadInstallation(directory = configurationDirectory) {
  try {
    const state = JSON.parse(
      await readFile(join(directory, "state.json"), "utf8"),
    );
    if (state.version !== 1 || !state.installationId || !state.config)
      throw new Error("Invalid state");
    return state;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(
      "Estado de instalação inválido; restaure o backup antes de retomar.",
    );
  }
}
export function createInstallation(options) {
  return {
    version: 1,
    installationId: randomUUID(),
    config: {
      dbPort: options.dbPort,
      appPort: options.appPort,
      host: options.host,
      adminEmail: options.adminEmail,
      installDir: options.installDir,
    },
    completed: [],
  };
}
export async function saveInstallation(
  state,
  directory = configurationDirectory,
) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await atomicPrivateFile(
    join(directory, "state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
}
export function assertSameInstallation(state, options) {
  for (const [key, value] of Object.entries(state.config))
    if (options[key] !== value)
      throw new Error(
        `Configuração ${key} difere da instalação existente. Reutilize os argumentos originais; migração de configuração é explícita.`,
      );
}
