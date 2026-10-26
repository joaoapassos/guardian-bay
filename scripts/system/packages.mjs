import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  chmod,
  chown,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { run } from "./runner.mjs";
import { atomicPrivateFile, configurationDirectory } from "./state.mjs";

export const pgKeyFingerprint = "B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8";
export function postgresKeyFingerprint(armored) {
  const raw = Buffer.from(
    armored
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z0-9+/]+={0,2}$/.test(line))
      .join(""),
    "base64",
  );
  if (raw[0] !== 0x99 || raw[3] !== 4 || raw.length < raw.readUInt16BE(1) + 3)
    throw new Error("Formato da chave PGDG inesperado.");
  return createHash("sha1")
    .update(raw.subarray(0, raw.readUInt16BE(1) + 3))
    .digest("hex")
    .toUpperCase();
}
const backupPath = `${configurationDirectory}/package-policy.json`;
export async function restorePackagePolicy() {
  if (!existsSync(backupPath)) return;
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  const path = "/etc/postgresql-common/createcluster.conf";
  if (backup.existed) {
    await writeFile(path, backup.content);
    await chmod(path, backup.mode);
    await chown(path, backup.uid, backup.gid);
  } else
    await unlink(path).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  if (backup.maskedCaddy) {
    await run("systemctl", ["unmask", "--runtime", "caddy.service"]);
    await run("systemctl", ["disable", "caddy"], {
      allowFailure: true,
      capture: true,
    });
  }
  await unlink(backupPath);
}
async function repositoryKey() {
  const response = await fetch(
    "https://www.postgresql.org/media/keys/ACCC4CF8.asc",
    { redirect: "error", signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok || !response.body)
    throw new Error("Falha ao obter chave oficial PGDG.");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 32768) throw new Error("Chave PGDG excedeu limite.");
    chunks.push(chunk);
  }
  const key = Buffer.concat(chunks).toString("utf8");
  if (postgresKeyFingerprint(key) !== pgKeyFingerprint)
    throw new Error(
      "Fingerprint PGDG mudou; reveja a fonte oficial antes de instalar.",
    );
  return key;
}
export async function installPackages() {
  await restorePackagePolicy();
  const env = { DEBIAN_FRONTEND: "noninteractive", NEEDRESTART_MODE: "l" };
  console.info(
    "[Pacotes] Índices Ubuntu e dependências de compilação/PostgreSQL.",
  );
  await run("apt-get", ["update"], { env });
  await run(
    "apt-get",
    [
      "install",
      "-y",
      "--no-upgrade",
      "ca-certificates",
      "build-essential",
      "postgresql-common",
    ],
    { env },
  );
  const key = await repositoryKey();
  await writeFile("/usr/share/keyrings/guardian-bay-pgdg.asc", key, {
    mode: 0o644,
  });
  await chmod("/usr/share/keyrings/guardian-bay-pgdg.asc", 0o644);
  const sourcePath = "/etc/apt/sources.list.d/guardian-bay-pgdg.sources";
  const source =
    "Types: deb\nURIs: https://apt.postgresql.org/pub/repos/apt\nSuites: noble-pgdg\nArchitectures: amd64\nComponents: main\nSigned-By: /usr/share/keyrings/guardian-bay-pgdg.asc\n";
  if (existsSync(sourcePath) && (await readFile(sourcePath, "utf8")) !== source)
    throw new Error(
      "Fonte APT guardian-bay-pgdg já existe com conteúdo diferente.",
    );
  await writeFile(sourcePath, source, { mode: 0o644 });
  const path = "/etc/postgresql-common/createcluster.conf";
  const existed = existsSync(path);
  const metadata = existed ? await stat(path) : { mode: 0o644, uid: 0, gid: 0 };
  const backup = {
    existed,
    content: existed ? await readFile(path, "utf8") : "",
    mode: metadata.mode & 0o777,
    uid: metadata.uid,
    gid: metadata.gid,
    maskedCaddy: false,
  };
  await atomicPrivateFile(backupPath, JSON.stringify(backup));
  try {
    // Temporary package policy: no unrelated default cluster is created.
    await writeFile(
      path,
      `${backup.content}\n# Guardian Bay: temporary installation policy\ncreate_main_cluster = false\n`,
    );
    if (
      !existsSync("/lib/systemd/system/caddy.service") &&
      !existsSync("/usr/lib/systemd/system/caddy.service") &&
      !existsSync("/run/systemd/system/caddy.service") &&
      !existsSync("/etc/systemd/system/caddy.service")
    ) {
      backup.maskedCaddy = true;
      await atomicPrivateFile(backupPath, JSON.stringify(backup));
      await run("systemctl", ["mask", "--runtime", "caddy.service"]);
    }
    console.info(
      "[Pacotes] Chave PGDG conferida; PostgreSQL18 e Caddy do repositório Ubuntu.",
    );
    await run("apt-get", ["update"], { env });
    await run(
      "apt-get",
      [
        "install",
        "-y",
        "--no-upgrade",
        "postgresql-18",
        "postgresql-client-18",
        "caddy",
      ],
      { env },
    );
  } finally {
    await restorePackagePolicy();
  }
}
