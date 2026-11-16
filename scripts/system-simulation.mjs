import { uptime } from "node:os";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { run } from "./system/runner.mjs";
import {
  changeSimulationState,
  formatUptime,
  parseSimulationCommand,
} from "./system/simulation-control.mjs";

const unit = "guardian-bay-simulation.service";
async function serviceState() {
  const result = await run(
    "systemctl",
    [
      "show",
      unit,
      "--property=LoadState,ActiveState,ExecMainStartTimestamp,ActiveEnterTimestampMonotonic",
    ],
    { capture: true },
  );
  const fields = Object.fromEntries(
    result.output
      .trim()
      .split("\n")
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  if (fields.LoadState !== "loaded")
    throw new Error(
      "Serviço de simulação não instalado. Execute system:init ou system:update.",
    );
  if (
    !["active", "activating", "inactive", "failed"].includes(fields.ActiveState)
  )
    throw new Error("Serviço em transição; tente novamente.");
  return fields;
}
async function privileged(args) {
  if (process.getuid?.() === 0) await run("systemctl", args, { timeout: 0 });
  else await run("sudo", ["--", "systemctl", ...args], { timeout: 0 });
}
async function main() {
  if (process.platform !== "linux")
    throw new Error("O controle da simulação exige Ubuntu com systemd.");
  const command = parseSimulationCommand(process.argv.slice(2));
  const service = {
    active: async () =>
      ["active", "activating"].includes((await serviceState()).ActiveState),
    start: () => privileged(["enable", "--now", unit]),
    stop: () => privileged(["disable", "--now", unit]),
  };
  if (command === "status") {
    const state = await serviceState();
    const elapsed =
      state.ActiveState === "active"
        ? formatUptime(Number(state.ActiveEnterTimestampMonotonic), uptime())
        : "não ativa";
    console.info(
      `Simulação: ${state.ActiveState}; tempo ativo: ${elapsed}; início: ${state.ExecMainStartTimestamp || "não disponível"}.`,
    );
    await run(
      "journalctl",
      ["-u", unit, "-n", "30", "--no-pager", "--output=short-iso"],
      { allowFailure: true },
    );
    return;
  }
  const confirm = async (active) => {
    if (!stdin.isTTY)
      throw new Error("Use --start ou --stop em terminal não interativo.");
    const input = createInterface({ input: stdin, output: stdout });
    try {
      return (
        (
          await input.question(
            active
              ? "A simulação está ativa. Deseja interromper? (s/n) "
              : "A simulação está desativada. Deseja iniciar? (s/n) ",
          )
        )
          .trim()
          .toLowerCase() === "s"
      );
    } finally {
      input.close();
    }
  };
  const result = await changeSimulationState(command, service, confirm);
  console.info(
    result === "active" ? "Simulação ativa." : "Simulação interrompida.",
  );
}
try {
  await main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Falha no controle da simulação.",
  );
  process.exitCode = 1;
}
