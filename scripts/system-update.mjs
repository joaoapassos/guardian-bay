import { existsSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrl, installationSecrets } from "./system/environment.mjs";
import {
  psql,
  runtimeGrantsSql,
  verifyDatabaseRoles,
} from "./system/postgres.mjs";
import {
  inspectPlatform,
  parseInitOptions,
  supportedPlatform,
  validateSource,
} from "./system/preflight.mjs";
import { prepareRelease, sealRelease } from "./system/release.mjs";
import { run } from "./system/runner.mjs";
import {
  buildApplication,
  httpProbe,
  pointCurrent,
} from "./system/services.mjs";
import { loadInstallation, saveInstallation } from "./system/state.mjs";
import {
  checkMigrationHistory,
  readUpdateMigrations,
  runUpdateSteps,
} from "./system/update.mjs";

async function identity(name) {
  const result = await run("getent", ["passwd", name], { capture: true });
  const fields = result.output.trim().split(":");
  const uid = Number(fields[2]),
    gid = Number(fields[3]);
  if (
    fields[0] !== name ||
    !Number.isInteger(uid) ||
    uid <= 0 ||
    uid >= 1000 ||
    !Number.isInteger(gid) ||
    gid <= 0 ||
    fields[6] !== "/usr/sbin/nologin"
  )
    throw new Error("Conta de serviço ausente ou inválida.");
  return { uid, gid };
}

export async function activate(
  options,
  state,
  release,
  previous,
  dependencies = {},
) {
  const point = dependencies.pointCurrent ?? pointCurrent;
  const execute = dependencies.run ?? run;
  const probe = dependencies.httpProbe ?? httpProbe;
  const save = dependencies.saveInstallation ?? saveInstallation;
  const delay =
    dependencies.delay ?? (() => new Promise((done) => setTimeout(done, 1000)));
  await point(options.installDir, release.directory);
  try {
    await execute("systemctl", ["restart", "guardian-bay"]);
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      const active = await execute(
        "systemctl",
        ["is-active", "--quiet", "guardian-bay"],
        { allowFailure: true },
      );
      if (active.code === 0 && (await probe(options.appPort))) {
        healthy = true;
        break;
      }
      await delay();
    }
    if (!healthy) throw new Error("Serviço ou resposta HTTP inválidos.");
    state.activeRelease = release.directory;
    await save(state);
  } catch (error) {
    try {
      await point(options.installDir, previous);
      await execute("systemctl", ["restart", "guardian-bay"]);
      console.error(
        "Release anterior restaurada; verifique sua saúde e a compatibilidade com o banco.",
      );
    } catch {
      console.error(
        "Não foi possível restaurar a release anterior; intervenção operacional necessária.",
      );
    }
    throw error;
  }
}

async function main() {
  if (!supportedPlatform(inspectPlatform()))
    throw new Error(
      "Ubuntu Server 24.04/26.04 x64 com systemd e Node 24.19+ são necessários.",
    );
  const source = validateSource({
    sourceDir: process.cwd(),
    npmCli: process.env.GUARDIAN_UPDATE_NPM_CLI ?? process.env.npm_execpath,
  });
  if (process.getuid() !== 0 || process.env.GUARDIAN_INIT_LOCKED !== "1") {
    const args = [
      "flock",
      "-n",
      "/run/guardian-bay-init.lock",
      "env",
      "GUARDIAN_INIT_LOCKED=1",
      `GUARDIAN_UPDATE_NPM_CLI=${source.npmCli}`,
      process.execPath,
      fileURLToPath(import.meta.url),
    ];
    const result = await run(
      process.getuid() === 0 ? args.shift() : "sudo",
      process.getuid() === 0 ? args : ["--", ...args],
      { allowFailure: true, timeout: 0 },
    );
    if (result.code !== 0)
      throw new Error(
        "Atualização elevada não concluiu; confira a etapa indicada ou concorrência.",
      );
    return;
  }
  if (process.argv.length !== 2)
    throw new Error("system:update não aceita opções de instalação.");
  const state = await loadInstallation();
  if (!state || !state.completed?.includes("application") || !state.pgSystemId)
    throw new Error("Instalação completa não encontrada.");
  const config = state.config;
  const options = parseInitOptions([
    "--db-port",
    String(config.dbPort),
    "--app-port",
    String(config.appPort),
    "--host",
    config.host,
    "--admin-email",
    config.adminEmail,
    "--install-dir",
    config.installDir,
  ]);
  options.sourceDir = source.sourceDir;
  options.npmCli = source.npmCli;
  options.preserveRuntimeTools = true;
  const unit = await readFile(
    "/etc/systemd/system/guardian-bay.service",
    "utf8",
  );
  if (!unit.startsWith(`# Guardian Bay managed ${state.installationId}\n`))
    throw new Error("Unidade não pertence à instalação.");
  const marker = await readFile(
    "/etc/postgresql/18/guardian_bay/conf.d/guardian-bay.conf",
    "utf8",
  );
  if (!marker.includes(`# installation ${state.installationId}\n`))
    throw new Error("Cluster não pertence à instalação.");
  const link = join(options.installDir, "current");
  if (!(await lstat(link)).isSymbolicLink())
    throw new Error("Release atual inválida.");
  const previous = await realpath(link);
  const releases = await realpath(join(options.installDir, "releases"));
  if (
    !previous.startsWith(releases + sep) ||
    previous !== (await realpath(state.activeRelease))
  )
    throw new Error("Release atual diverge do estado da instalação.");
  for (const path of [
    "/etc/guardian-bay/secrets.json",
    "/etc/guardian-bay/runtime.env",
    "/etc/guardian-bay/migrator.env",
  ])
    if (!existsSync(path))
      throw new Error(
        "Configuração persistente incompleta; restaure o backup.",
      );
  const secrets = await installationSecrets();
  const app = await identity("guardian-bay"),
    builder = await identity("guardian-bay-build"),
    migrator = await identity("guardian-bay-migrate");
  const serviceIdentity = { ...app, builder, migrator };
  const systemId = (
    await psql(options, "SELECT system_identifier FROM pg_control_system();")
  ).output.trim();
  if (systemId !== state.pgSystemId)
    throw new Error("Identidade do cluster mudou.");
  await verifyDatabaseRoles(options, secrets);
  const historyText = (
    await psql(
      options,
      "SELECT created_at, hash FROM drizzle.__drizzle_migrations ORDER BY created_at;",
      { database: "guardian_bay" },
    )
  ).output.trim();
  const history = historyText
    ? historyText.split(/\r?\n/).map((line) => {
        const [when, hash] = line.split("|");
        return { when: Number(when), hash };
      })
    : [];
  checkMigrationHistory(await readUpdateMigrations(source.sourceDir), history);
  let release;
  await runUpdateSteps({
    prepare: async () => {
      release = await prepareRelease(options, serviceIdentity);
      await sealRelease(release, serviceIdentity);
      checkMigrationHistory(
        await readUpdateMigrations(release.directory),
        history,
      );
    },
    migrate: async () =>
      run(
        "runuser",
        [
          "-u",
          "guardian-bay-migrate",
          "--",
          release.tools.node,
          "node_modules/drizzle-kit/bin.cjs",
          "migrate",
        ],
        {
          cwd: release.directory,
          env: {
            ...release.env,
            MIGRATION_DATABASE_URL: databaseUrl(
              "guardian_bay_migrator",
              secrets.migratorPassword,
              options.dbPort,
            ),
            NODE_ENV: "production",
          },
          sensitive: true,
        },
      ),
    grants: async () => {
      await psql(options, `BEGIN;\n${runtimeGrantsSql()}\nCOMMIT;`, {
        database: "guardian_bay",
      });
      await verifyDatabaseRoles(options, secrets);
    },
    build: async () =>
      buildApplication({
        options,
        state,
        release,
        identity: serviceIdentity,
        env: {
          DATABASE_URL: databaseUrl(
            "guardian_bay_app",
            secrets.appPassword,
            options.dbPort,
          ),
        },
      }),
    activate: async () => activate(options, state, release, previous),
  });
  console.info(
    "Atualização concluída; serviço ativo e resposta HTTP validada.",
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Falha de atualização.",
    );
    process.exitCode = 1;
  }
}
