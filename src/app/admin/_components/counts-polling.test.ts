import { afterEach, expect, it, vi } from "vitest";
import { startCountsPolling } from "./counts-polling";

const initial = { products: 1, categories: 2, orders: 3, users: 4 };
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("polls every two seconds and only emits changed totals", async () => {
  vi.useFakeTimers();
  const changed = { ...initial, products: 2 };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(initial)))
    .mockResolvedValueOnce(new Response(JSON.stringify(changed)));
  const onChange = vi.fn();
  const stop = startCountsPolling(initial, {
    fetcher,
    onChange,
    onDenied: vi.fn(),
  });
  await vi.advanceTimersByTimeAsync(2000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2000);
  expect(onChange).toHaveBeenCalledExactlyOnceWith(changed);
  stop();
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("stops when access is revoked", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 403 }));
  const onDenied = vi.fn();
  startCountsPolling(initial, { fetcher, onChange: vi.fn(), onDenied });
  await vi.advanceTimersByTimeAsync(8000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(onDenied).toHaveBeenCalledOnce();
});

it("keeps the last confirmed totals after a network error and retries", async () => {
  vi.useFakeTimers();
  const changed = { ...initial, orders: 9 };
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify(changed)));
  const onChange = vi.fn();
  const stop = startCountsPolling(initial, {
    fetcher,
    onChange,
    onDenied: vi.fn(),
  });
  await vi.advanceTimersByTimeAsync(2000);
  expect(onChange).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2000);
  expect(onChange).toHaveBeenCalledExactlyOnceWith(changed);
  stop();
});

it("does not overlap slow requests or update after unmount", async () => {
  vi.useFakeTimers();
  let resolve!: (response: Response) => void;
  const fetcher = vi.fn().mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  const onChange = vi.fn();
  const stop = startCountsPolling(initial, {
    fetcher,
    onChange,
    onDenied: vi.fn(),
  });
  await vi.advanceTimersByTimeAsync(8000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  stop();
  resolve(new Response(JSON.stringify({ ...initial, users: 8 })));
  await vi.advanceTimersByTimeAsync(4000);
  expect(onChange).not.toHaveBeenCalled();
});
