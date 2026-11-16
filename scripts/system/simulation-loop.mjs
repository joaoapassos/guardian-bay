import { randomUUID } from "node:crypto";
import { randomBatchSize } from "./simulation-scheduler.mjs";

// perform resolves only after commit; errors and logs never include exception text.
export async function runSimulation({
  scheduler,
  clock,
  random,
  makeId = randomUUID,
  signal,
  perform,
  wait,
  log,
  state = { load: async () => ({}), save: async () => {} },
}) {
  const pending = new Map(Object.entries(await state.load()));
  while (!signal.aborted) {
    const operation = scheduler.next(clock());
    if (!operation) {
      await wait(1000, signal);
      continue;
    }
    if (!pending.has(operation)) {
      pending.set(operation, {
        remaining: randomBatchSize(random),
        id: makeId(),
      });
      await state.save(Object.fromEntries(pending));
    }
    const batch = pending.get(operation);
    let id;
    try {
      id = await perform(operation, batch.id);
    } catch (error) {
      const known = new Set([
        "SIMULATION_LIMIT",
        "ADMIN_UNAVAILABLE",
        "CATEGORY_UNAVAILABLE",
        "SIMULATED_INPUT_UNAVAILABLE",
      ]);
      const reason =
        error instanceof Error && known.has(error.message)
          ? error.message
          : "OPERATION_FAILED";
      log({ operation, outcome: "failure", reason });
      if (reason === "SIMULATION_LIMIT") return;
      scheduler.failure(operation, clock());
      if (!signal.aborted) await wait(1000, signal);
      continue;
    }
    const remaining = batch.remaining - 1;
    if (remaining === 0) pending.delete(operation);
    else pending.set(operation, { remaining, id: makeId() });
    await state.save(Object.fromEntries(pending));
    if (remaining === 0) scheduler.success(operation, clock());
    log({ operation, outcome: "success", id });
    if (!signal.aborted) await wait(1000, signal);
  }
}
