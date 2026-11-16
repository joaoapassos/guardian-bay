import { performance } from "node:perf_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { parseSimulationConfig } from "./simulation-config.mjs";
import { runSimulation } from "./simulation-loop.mjs";
import { createSimulationScheduler } from "./simulation-scheduler.mjs";
import { createSimulationState } from "./simulation-state.mjs";
import { createSimulationStore } from "./simulation-store.mjs";

const controller = new AbortController();
let disconnected = false;
for (const name of ["SIGINT", "SIGTERM"])
  process.once(name, () => controller.abort());
const emit = (event) =>
  console.log(
    JSON.stringify({ timestamp: new Date().toISOString(), ...event }),
  );
const wait = (duration, signal) =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, duration);
    signal.addEventListener("abort", finish, { once: true });
  });

let config;
try {
  config = parseSimulationConfig(process.env);
} catch {
  console.error("Configuração local de simulação inválida.");
  process.exitCode = 1;
}
if (config) {
  const client = postgres(config.databaseUrl, {
    max: 1,
    onnotice: () => {},
    onclose: () => {
      disconnected = true;
      controller.abort();
    },
  });
  try {
    const store = createSimulationStore({
      db: drizzle(client),
      adminEmail: config.adminEmail,
      maxPerType: config.maxPerType,
    });
    const [lock] =
      await client`SELECT pg_try_advisory_lock(1195521366, 2) AS acquired`;
    if (!lock.acquired) throw new Error("ALREADY_RUNNING");
    emit({ outcome: "started" });
    await runSimulation({
      scheduler: createSimulationScheduler(performance.now()),
      clock: () => performance.now(),
      random: Math.random,
      signal: controller.signal,
      perform: (operation, id) => store.create(operation, id),
      wait,
      log: emit,
      state: createSimulationState(process.env.STATE_DIRECTORY),
    });
    emit({ outcome: "stopped" });
  } catch {
    emit({ outcome: "failure", reason: "WORKER_FAILED" });
    process.exitCode = 1;
  } finally {
    const wasDisconnected = disconnected;
    await client.end({ timeout: 5 });
    if (wasDisconnected) process.exitCode = 1;
  }
}
