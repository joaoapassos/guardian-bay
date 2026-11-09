import { describe, expect, it, vi } from "vitest";
import { createAdminUserCache } from "./admin-user-cache";

describe("cache de listagem administrativa", () => {
  it("reutiliza apenas a mesma página e filtro até expirar", async () => {
    let now = 0;
    const cache = createAdminUserCache<number>(() => now);
    const load = vi.fn(async () => 1);
    await cache.get("admin:1", load);
    await cache.get("admin:1", load);
    await cache.get("customer:1", load);
    expect(load).toHaveBeenCalledTimes(2);
    now = 30_000;
    await cache.get("admin:1", load);
    expect(load).toHaveBeenCalledTimes(3);
  });
  it("não guarda leitura antiga concluída depois da invalidação", async () => {
    const cache = createAdminUserCache<number>(() => 0);
    let finish!: (value: number) => void;
    const pending = cache.get(
      "admin:1",
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    cache.clear();
    finish(1);
    await pending;
    expect(await cache.get("admin:1", async () => 2)).toBe(2);
  });
});
