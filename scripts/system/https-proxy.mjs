import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { chmod, copyFile, readFile, unlink, writeFile } from "node:fs/promises";
import { request } from "node:https";
import { run } from "./runner.mjs";
import { saveInstallation } from "./state.mjs";

const configPath = "/etc/caddy/Caddyfile",
  fragmentPath = "/etc/caddy/guardian-bay.caddy";
export function renderProxy({ installationId, host, appPort, shared = false }) {
  return readFileSync(new URL("./templates/Caddyfile", import.meta.url), "utf8")
    .replaceAll("{{INSTALLATION_ID}}", installationId)
    .replaceAll("{{HOST}}", host)
    .replaceAll("{{APP_PORT}}", String(appPort))
    .replaceAll(
      "{{BIND}}",
      shared ? "" : `bind ${host === "localhost" ? "127.0.0.1" : host}`,
    );
}
export function httpsProbe(host, ca) {
  return new Promise((done) => {
    const req = request(
      {
        hostname: host,
        port: 443,
        path: "/login",
        method: "GET",
        ca,
        timeout: 2000,
      },
      (res) => {
        res.resume();
        done(res.statusCode === 200);
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(false));
    req.end();
  });
}
export async function prepareHttps({ options, state }) {
  const current = existsSync(configPath)
    ? await readFile(configPath, "utf8")
    : "";
  const oldFragment = existsSync(fragmentPath)
    ? await readFile(fragmentPath, "utf8")
    : null;
  const marker = `# Guardian Bay managed ${state.installationId}`;
  if (oldFragment && !oldFragment.startsWith(marker))
    throw new Error(
      "Fragmento Caddy preexistente não pertence a esta instalação.",
    );
  const shared = state.proxyMode === "shared";
  if (
    !shared &&
    current &&
    !current.startsWith(marker) &&
    createHash("sha256").update(current).digest("hex") !==
      state.caddyOriginalHash
  )
    throw new Error(
      "Caddyfile foi alterado por outro operador; configuração preservada.",
    );
  const serviceUser = (
    await run("systemctl", ["show", "caddy", "--property=User", "--value"], {
      capture: true,
    })
  ).output.trim();
  if (serviceUser !== "caddy")
    throw new Error(
      "Caddy preexistente usa unidade personalizada; integre o fragmento manualmente sem expor o Next diretamente.",
    );
  const command = (
    await run(
      "systemctl",
      ["show", "caddy", "--property=ExecStart", "--value"],
      { capture: true },
    )
  ).output;
  if (!command.includes("/etc/caddy/Caddyfile"))
    throw new Error(
      "Unidade Caddy usa outro arquivo; configuração preservada.",
    );
  const fragment = renderProxy({
    installationId: state.installationId,
    host: options.host,
    appPort: options.appPort,
    shared,
  });
  const importLine = `import ${fragmentPath}`;
  const candidate = shared
    ? current.includes(importLine)
      ? current
      : `${current.trimEnd()}\n\n${importLine}\n`
    : `${marker}\n{\n    auto_https disable_redirects\n}\n${importLine}\n`;
  const staged = "/etc/caddy/guardian-bay-stage.Caddyfile";
  const wasActive =
    (
      await run("systemctl", ["is-active", "caddy"], {
        capture: true,
        allowFailure: true,
      })
    ).code === 0;
  try {
    await writeFile(fragmentPath, fragment, { mode: 0o644 });
    await writeFile(staged, candidate, { mode: 0o644 });
    await chmod(fragmentPath, 0o644);
    await chmod(staged, 0o644);
    await run(
      "runuser",
      [
        "-u",
        "caddy",
        "--",
        "caddy",
        "validate",
        "--config",
        staged,
        "--adapter",
        "caddyfile",
      ],
      { sensitive: true },
    );
    await writeFile(configPath, candidate, { mode: 0o644 });
    await run("systemctl", ["enable", "caddy"]);
    await run("systemctl", [wasActive ? "reload" : "start", "caddy"]);
    const certificate =
      "/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt";
    let healthy = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (
        existsSync(certificate) &&
        (await httpsProbe(options.host, await readFile(certificate)))
      ) {
        healthy = true;
        break;
      }
      if (attempt % 5 === 0)
        console.info(
          "[HTTPS] Aguardando certificado interno e resposta da aplicação…",
        );
      await new Promise((done) => setTimeout(done, 1000));
    }
    if (!healthy)
      throw new Error(
        "HTTPS não ficou pronto. Confira Caddy, certificado e bind local.",
      );
    await copyFile(certificate, "/etc/guardian-bay/local-ca.crt");
    await chmod("/etc/guardian-bay/local-ca.crt", 0o644);
    state.proxyConfigured = true;
    await saveInstallation(state);
  } catch (error) {
    if (current) await writeFile(configPath, current, { mode: 0o644 });
    if (oldFragment !== null)
      await writeFile(fragmentPath, oldFragment, { mode: 0o644 });
    else await unlink(fragmentPath).catch(() => {});
    await run("systemctl", [wasActive ? "reload" : "stop", "caddy"], {
      allowFailure: true,
      sensitive: true,
    });
    if (!wasActive && !shared)
      await run("systemctl", ["disable", "caddy"], {
        allowFailure: true,
        sensitive: true,
      });
    throw error;
  } finally {
    await unlink(staged).catch(() => {});
  }
}
