const initialDelays = {
  user: 0,
  category: 45_000,
  product: 90_000,
  order: 135_000,
};
const interval = 300_000;

export function randomBatchSize(random = Math.random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new TypeError("Sorteio inválido.");
  return Math.floor(value * 5) + 1;
}

// State only advances after a caller reports a committed operation.
export function createSimulationScheduler(start) {
  if (!Number.isFinite(start)) throw new TypeError("Relógio inválido.");
  const entries = Object.fromEntries(
    Object.entries(initialDelays).map(([name, delay]) => [
      name,
      { due: start + delay, retry: 0, failures: 0 },
    ]),
  );
  function entry(name) {
    if (!Object.hasOwn(entries, name))
      throw new TypeError("Operação inválida.");
    return entries[name];
  }
  return {
    next(now) {
      if (!Number.isFinite(now)) throw new TypeError("Relógio inválido.");
      return (
        Object.entries(entries)
          .filter(([, state]) => state.due <= now && state.retry <= now)
          .sort((a, b) => a[1].due - b[1].due)[0]?.[0] ?? null
      );
    },
    success(name, now) {
      const state = entry(name);
      if (!Number.isFinite(now)) throw new TypeError("Agendamento inválido.");
      state.due = now + interval;
      state.retry = 0;
      state.failures = 0;
    },
    failure(name, now) {
      const state = entry(name);
      if (!Number.isFinite(now)) throw new TypeError("Relógio inválido.");
      state.failures = Math.min(state.failures + 1, 4);
      state.retry = now + Math.min(30_000, 5000 * 2 ** (state.failures - 1));
    },
  };
}
