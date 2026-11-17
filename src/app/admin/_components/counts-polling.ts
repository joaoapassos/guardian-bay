export type AdminCounts = {
  products: number;
  categories: number;
  orders: number;
  users: number;
};
const keys = ["products", "categories", "orders", "users"] as const;

function isCounts(value: unknown): value is AdminCounts {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return keys.every(
    (key) =>
      Number.isSafeInteger(candidate[key]) && (candidate[key] as number) >= 0,
  );
}

export function startCountsPolling(
  initial: AdminCounts,
  {
    fetcher,
    onChange,
    onDenied,
  }: {
    fetcher: typeof fetch;
    onChange: (counts: AdminCounts) => void;
    onDenied: () => void;
  },
) {
  let previous = initial;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const abort = new AbortController();
  const poll = async () => {
    try {
      const response = await fetcher("/api/admin/counts", {
        cache: "no-store",
        signal: abort.signal,
      });
      if (stopped) return;
      if (response.status === 401 || response.status === 403) {
        stopped = true;
        onDenied();
        return;
      }
      if (response.ok) {
        const value: unknown = await response.json();
        if (
          !stopped &&
          isCounts(value) &&
          keys.some((key) => value[key] !== previous[key])
        ) {
          previous = value;
          onChange(value);
        }
      }
    } catch {
      // A temporary network failure leaves the last confirmed values visible.
    } finally {
      if (!stopped) timer = setTimeout(poll, 2000);
    }
  };
  timer = setTimeout(poll, 2000);
  return () => {
    stopped = true;
    clearTimeout(timer);
    abort.abort();
  };
}
