import { createProductFactory } from "./product-factory.mjs";

export async function runProductSeed({
  state,
  writer,
  checkpoint,
  signal,
  log = console.info,
}) {
  state.created = await writer.count(state.runId);
  const makeProduct = createProductFactory(await writer.names());
  try {
    while (state.created < state.count && !signal?.aborted) {
      const rows = Array.from(
        { length: Math.min(100, state.count - state.created) },
        () => ({ product: makeProduct() }),
      );
      await writer.persist(rows, { runId: state.runId, count: state.count });
      const previous = state.created;
      state.created = await writer.count(state.runId);
      if (state.created === previous) throw new Error("SEED_NO_PROGRESS");
      await checkpoint.save(state);
      log(`Produtos confirmados: ${state.created}/${state.count}.`);
    }
    state.reason = state.created >= state.count ? "COMPLETE" : "INTERRUPTED";
  } catch {
    state.reason = "FAILED";
  } finally {
    state.created = await writer.count(state.runId);
    await checkpoint.save(state);
  }
  return state;
}
