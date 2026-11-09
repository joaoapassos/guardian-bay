export function createAdminUserCache<T>(now: () => number = Date.now) {
  const entries = new Map<string, { value: T; expires: number }>();
  let generation = 0;
  return {
    async get(key: string, load: () => Promise<T>): Promise<T> {
      const entry = entries.get(key);
      if (entry && entry.expires > now()) return entry.value;
      entries.delete(key);
      const started = generation;
      const value = await load();
      if (started === generation) {
        if (entries.size >= 60)
          entries.delete(entries.keys().next().value as string);
        entries.set(key, { value, expires: now() + 30_000 });
      }
      return value;
    },
    clear() {
      generation++;
      entries.clear();
    },
  };
}
