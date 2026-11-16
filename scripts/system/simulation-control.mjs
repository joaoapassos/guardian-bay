const commands = new Set(["--start", "--stop", "--status"]);

export function formatUptime(startMicros, uptimeSeconds) {
  if (
    !Number.isFinite(startMicros) ||
    startMicros <= 0 ||
    !Number.isFinite(uptimeSeconds)
  )
    return "indisponível";
  const seconds = Math.max(
    0,
    Math.floor(uptimeSeconds - startMicros / 1_000_000),
  );
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min ${seconds % 60}s`;
}

export function parseSimulationCommand(args) {
  if (args.length === 0) return "toggle";
  if (args.length !== 1 || !commands.has(args[0]))
    throw new Error("Use --start, --stop ou --status.");
  return args[0].slice(2);
}

export async function changeSimulationState(command, service, confirm) {
  const active = await service.active();
  if (command === "status") return active ? "active" : "inactive";
  if (command === "toggle") {
    if (!(await confirm(active))) return active ? "active" : "inactive";
    command = active ? "stop" : "start";
  }
  if (command === "start") {
    if (!active) await service.start();
    return "active";
  }
  if (command === "stop") {
    await service.stop();
    return "inactive";
  }
  throw new Error("Comando de simulação inválido.");
}
