import { existsSync, readFileSync } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  readlink,
  rename,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { request } from "node:http";
import { join, resolve, sep } from "node:path";
import { prepareHttps } from "./https-proxy.mjs";
import { sealRelease } from "./release.mjs";
import { run } from "./runner.mjs";
import { saveInstallation } from "./state.mjs";

export function renderService({ installationId, installDir, appPort }) {
  return readFileSync(
    new URL("./templates/guardian-bay.service", import.meta.url),
    "utf8",
  )
    .replaceAll("{{INSTALLATION_ID}}", installationId)
    .replaceAll("{{INSTALL_DIR}}", installDir)
    .replaceAll("{{APP_PORT}}", String(appPort));
}
function httpProbe(port) {
  return new Promise((done) => {
    const req = request(
      { hostname: "127.0.0.1", port, path: "/login", timeout: 2000 },
      (res) => {
        res.resume();
        done(res.statusCode === 200);
      },
    );
    req.on("error", () => done(false));
    req.on("timeout", () => req.destroy());
    req.end();
  });
}
async function pointCurrent(base, target) {
  const link = join(base, "current");
  const temporary = join(base, "current.next");
  await unlink(temporary).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await symlink(target, temporary);
  await rename(temporary, link);
}
export async function deployApplication(context) {
  const { options, state, release, identity, env } = context;
  console.info("[Build] Build de produção como conta de build; sem testes.");
  await run("chown", [
    "-R",
    `${identity.builder.uid}:${identity.builder.gid}`,
    release.directory,
  ]);
  await run(
    "runuser",
    [
      "-u",
      "guardian-bay-build",
      "--",
      release.tools.node,
      release.tools.npm,
      "run",
      "build",
    ],
    {
      cwd: release.directory,
      env: {
        ...release.env,
        NODE_ENV: "production",
        DATABASE_URL: env.DATABASE_URL,
        DATABASE_POOL_MAX: "2",
      },
    },
  );
  await sealRelease(release, identity);
  const cache = join(release.directory, ".next/cache");
  await mkdir(cache, { recursive: true });
  await run("chown", ["-R", `${identity.uid}:${identity.gid}`, cache]);
  const link = join(options.installDir, "current");
  let previous;
  if (existsSync(link)) {
    if (!(await lstat(link)).isSymbolicLink())
      throw new Error("current não é um symlink gerenciado.");
    previous = await readlink(link);
    if (
      !resolve(options.installDir, previous).startsWith(
        join(options.installDir, "releases") + sep,
      )
    )
      throw new Error("Release atual aponta para fora da instalação.");
  }
  const unitPath = "/etc/systemd/system/guardian-bay.service";
  const oldUnit = existsSync(unitPath)
    ? await readFile(unitPath, "utf8")
    : null;
  const marker = `# Guardian Bay managed ${state.installationId}`;
  if (oldUnit && !oldUnit.startsWith(marker))
    throw new Error(
      "Unidade guardian-bay preexistente não pertence à instalação.",
    );
  const unit = renderService({
    installationId: state.installationId,
    installDir: options.installDir,
    appPort: options.appPort,
  });
  const staged = "/etc/guardian-bay/guardian-bay.service";
  await writeFile(staged, unit, { mode: 0o644 });
  await run("systemd-analyze", ["verify", staged], { sensitive: true });
  try {
    await pointCurrent(options.installDir, release.directory);
    if (unit !== oldUnit) await writeFile(unitPath, unit, { mode: 0o644 });
    await run("systemctl", ["daemon-reload"]);
    await run("systemctl", ["enable", "guardian-bay"]);
    await run("systemctl", ["restart", "guardian-bay"]);
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      if (await httpProbe(options.appPort)) {
        healthy = true;
        break;
      }
      if (i % 5 === 0)
        console.info("[Serviço] Aguardando resposta do Next em loopback…");
      await new Promise((done) => setTimeout(done, 1000));
    }
    if (!healthy)
      throw new Error(
        "Aplicação não ficou pronta; tentativa de restauração da release anterior.",
      );
    await prepareHttps(context);
    state.activeRelease = release.directory;
    state.completed = [
      ...new Set([...state.completed, "admin", "application"]),
    ];
    await saveInstallation(state);
    console.info(
      `[Pronto] https://${options.host} · admin ${options.adminEmail}`,
    );
    console.info(
      "Certificado público da CA: /etc/guardian-bay/local-ca.crt. Instale somente esse certificado nos clientes que acessarão a URL; a chave privada não é exportada.",
    );
    console.info(
      "Diagnóstico: sudo systemctl status guardian-bay caddy postgresql@18-guardian-bay; sudo journalctl -u guardian-bay -u caddy.",
    );
  } catch (error) {
    if (previous) {
      await pointCurrent(options.installDir, previous);
      if (oldUnit) await writeFile(unitPath, oldUnit, { mode: 0o644 });
      await run("systemctl", ["daemon-reload"], { allowFailure: true });
      await run("systemctl", ["restart", "guardian-bay"], {
        allowFailure: true,
      });
    } else {
      await run("systemctl", ["stop", "guardian-bay"], { allowFailure: true });
      await run("systemctl", ["disable", "guardian-bay"], {
        allowFailure: true,
      });
    }
    throw error;
  }
}
