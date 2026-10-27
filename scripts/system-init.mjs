import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, chown, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareAdmin } from "./system/admin.mjs";
import {
  databaseUrl,
  installationSecrets,
  prepareEnvironment,
} from "./system/environment.mjs";
import { installPackages, restorePackagePolicy } from "./system/packages.mjs";
import {
  preparePostgres,
  psql,
  runtimeGrantsSql,
  verifyDatabaseRoles,
} from "./system/postgres.mjs";
import {
  hostIsLocal,
  inspectPlatform,
  parseInitOptions,
  portInUse,
  supportedPlatform,
  validateSource,
} from "./system/preflight.mjs";
import {
  prepareRelease,
  sealRelease,
  serviceIdentity,
} from "./system/release.mjs";
import { run } from "./system/runner.mjs";
import { deployApplication } from "./system/services.mjs";
import {
  assertSameInstallation,
  configurationDirectory,
  createInstallation,
  loadInstallation,
  saveInstallation,
} from "./system/state.mjs";

export const initializationPhases = [
  "Preflight Ubuntu24.04/26.04 LTS x64, Node24.19+, npm e systemd",
  "Pacotes oficiais e conta de serviço sem login",
  "npm ci em release isolada",
  "Cluster PostgreSQL18 dedicado e segredos persistentes",
  "Migrations versionadas e grants restritos",
  "Admin inicial com senha mascarada, sem trim ou política de força",
  "Build, serviço não root e HTTPS localhost/IP com CA interna",
];
export async function runSystemInit(options) {
  let phase = "preflight";
  try {
    if (!supportedPlatform(inspectPlatform()))
      throw new Error(
        "Alvo suportado: Ubuntu Server24.04 ou 26.04 LTS x64/systemd com Node24.19+ e npm10+. Nenhum recurso foi provisionado.",
      );
    if (!hostIsLocal(options.host))
      throw new Error("O IP informado não está atribuído a este servidor.");
    options = validateSource(options);
    if (process.getuid() !== 0 || process.env.GUARDIAN_INIT_LOCKED !== "1") {
      console.info(
        "[Permissões] sudo/flock protegem a instalação. Banco, build e aplicação usam contas próprias.",
      );
      const args = [
        "flock",
        "-n",
        "/run/guardian-bay-init.lock",
        "env",
        "GUARDIAN_INIT_LOCKED=1",
        process.execPath,
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
        "--source-dir",
        options.sourceDir,
        "--npm-cli",
        options.npmCli,
      ];
      if (process.argv.includes("--source-dir"))
        args.splice(args.length - 4, 2);
      if (process.argv.includes("--npm-cli")) args.splice(args.length - 2, 2);
      const result = await run(
        process.getuid() === 0 ? args.shift() : "sudo",
        process.getuid() === 0 ? args : ["--", ...args],
        { allowFailure: true, timeout: 0 },
      );
      if (result.code !== 0)
        throw new Error(
          "Inicialização elevada não concluiu. Confira a etapa indicada e reutilize os mesmos argumentos para retomar.",
        );
      return;
    }
    let state = await loadInstallation();
    if (state) assertSameInstallation(state, options);
    else {
      if (
        existsSync("/etc/postgresql/18/guardian-bay/postgresql.conf") ||
        existsSync(options.installDir)
      )
        throw new Error(
          "Recursos preexistentes sem estado Guardian Bay; não serão adotados ou sobrescritos.",
        );
      if (await portInUse(options.dbPort))
        throw new Error("Porta do banco ocupada; escolha --db-port livre.");
      if (await portInUse(options.appPort))
        throw new Error(
          "Porta da aplicação ocupada; escolha --app-port livre.",
        );
      if (
        await portInUse(
          443,
          options.host === "localhost" ? "127.0.0.1" : options.host,
        )
      ) {
        const caddy = await run("systemctl", ["is-active", "caddy"], {
          capture: true,
          allowFailure: true,
        });
        if (caddy.code !== 0)
          throw new Error(
            "HTTPS443 ocupado por outro serviço; nenhuma configuração de proxy será sobrescrita.",
          );
      }
      state = createInstallation(options);
      await saveInstallation(state);
    }
    if (!state.proxyMode) {
      state.proxyMode = existsSync("/etc/caddy/Caddyfile") ? "shared" : "owned";
      await saveInstallation(state);
    }
    const sourceOwner = await stat(options.sourceDir);
    const secrets = await installationSecrets();
    phase = "pacotes";
    console.info(
      "[1/5] Instalando dependências do sistema por APT com fontes assinadas.",
    );
    await installPackages();
    if (
      state.proxyMode === "owned" &&
      !state.caddyOriginalHash &&
      existsSync("/etc/caddy/Caddyfile")
    ) {
      state.caddyOriginalHash = createHash("sha256")
        .update(await readFile("/etc/caddy/Caddyfile"))
        .digest("hex");
      await saveInstallation(state);
    }
    phase = "usuário";
    const identity = await serviceIdentity();
    await chmod(configurationDirectory, 0o750);
    await chown(configurationDirectory, 0, identity.gid);
    phase = "release";
    console.info("[2/5] Preparando código e dependências em release isolada.");
    const release = await prepareRelease(options, identity);
    phase = "postgres";
    console.info(
      "[3/5] Preparando cluster próprio, loopback e roles separadas.",
    );
    await preparePostgres(options, state, secrets);
    phase = "ambiente";
    const env = await prepareEnvironment(options, secrets, {
      ...identity,
      sourceOwner,
    });
    await sealRelease(release, identity);
    phase = "migrations";
    console.info(
      "[4/5] Aplicando somente migrations versionadas com credencial de migração.",
    );
    await run(
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
    );
    await psql(options, runtimeGrantsSql(), { database: "guardian_bay" });
    await verifyDatabaseRoles(options, secrets);
    state.completed = [...new Set([...state.completed, "database"])];
    await saveInstallation(state);
    const context = { options, state, secrets, env, release, identity };
    phase = "admin";
    await prepareAdmin(context);
    phase = "deploy";
    await deployApplication(context);
    console.info(
      "Inicialização concluída. Nenhum teste, seed ou DNS/hosts foi executado.",
    );
  } catch (error) {
    console.error(
      `Inicialização interrompida na etapa ${phase}. Recursos já preparados foram preservados.`,
    );
    throw error;
  } finally {
    if (
      process.platform === "linux" &&
      process.getuid() === 0 &&
      process.env.GUARDIAN_INIT_LOCKED === "1"
    )
      await restorePackagePolicy();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseInitOptions(process.argv.slice(2));
    if (options.dryRun) {
      console.info("Plano de inicialização (nenhuma instalação/alteração):");
      initializationPhases.forEach((phase, index) => {
        console.info(`${index + 1}. ${phase}`);
      });
      console.info(
        `Host:${options.host}; aplicação127.0.0.1:${options.appPort}; PostgreSQL127.0.0.1:${options.dbPort}. Sem DNS/hosts, testes ou seed.`,
      );
      console.info(
        `Plataforma atual elegível: ${supportedPlatform(inspectPlatform())}`,
      );
    } else await runSystemInit(options);
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Falha de inicialização; detalhes sensíveis omitidos.",
    );
    process.exitCode = 1;
  }
}
