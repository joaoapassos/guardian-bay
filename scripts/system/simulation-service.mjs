import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { run } from "./runner.mjs";

const unitPath = "/etc/systemd/system/guardian-bay-simulation.service";
export function renderSimulationService({
  installationId,
  installDir,
  adminEmail,
}) {
  if (
    !/^[a-zA-Z0-9-]+$/.test(installationId) ||
    !/^\/opt\/guardian-bay(?:-[a-z0-9-]+)?$/.test(installDir) ||
    !/^[!-~]+@[!-~]+\.[!-~]+$/.test(adminEmail) ||
    /[\s'"\\]/.test(adminEmail)
  )
    throw new Error("Configuração do serviço de simulação inválida.");
  const email = adminEmail.replaceAll("%", "%%");
  return `# Guardian Bay managed ${installationId}
[Unit]
Description=Guardian Bay simulation
After=network.target postgresql@18-guardian_bay.service
Requires=postgresql@18-guardian_bay.service
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=guardian-bay
Group=guardian-bay
WorkingDirectory=${installDir}/current
EnvironmentFile=/etc/guardian-bay/runtime.env
Environment=SIMULATION_ADMIN_EMAIL=${email}
ExecStart=${installDir}/tools/bin/node ${installDir}/current/scripts/system/simulation-worker.mjs
Restart=on-failure
RestartSec=10
TimeoutStopSec=60
UMask=0077
StateDirectory=guardian-bay-simulation
StateDirectoryMode=0700
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
`;
}

export async function installSimulationService(options, state) {
  const marker = `# Guardian Bay managed ${state.installationId}`;
  const old = existsSync(unitPath) ? await readFile(unitPath, "utf8") : null;
  if (old && !old.startsWith(`${marker}\n`))
    throw new Error(
      "Unidade de simulação preexistente não pertence à instalação.",
    );
  const content = renderSimulationService({
    installationId: state.installationId,
    installDir: options.installDir,
    adminEmail: options.adminEmail,
  });
  const staged = "/etc/guardian-bay/guardian-bay-simulation.service";
  await writeFile(staged, content, { mode: 0o644 });
  await run("systemd-analyze", ["verify", staged], { sensitive: true });
  if (content !== old) {
    await writeFile(unitPath, content, { mode: 0o644 });
    await run("systemctl", ["daemon-reload"]);
  }
}
