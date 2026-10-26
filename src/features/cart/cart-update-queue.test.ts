import { afterEach, describe, expect, it, vi } from "vitest";
import { CartUpdateQueue } from "./cart-update-queue";

afterEach(() => vi.useRealTimers());

describe("cart update queue", () => {
  it("sends only the final submitted value after 500ms of silence", async () => {
    vi.useFakeTimers();
    const send = vi.fn(async () => ({ success: true as const }));
    const refresh = vi.fn(async () => {});
    const queue = new CartUpdateQueue(send, refresh);
    for (let quantity = 2; quantity <= 10; quantity++) {
      void queue.request("p", quantity, 1);
      await vi.advanceTimersByTimeAsync(30);
    }
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("p", 10);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("cancels an unsent change when returning to confirmed quantity", async () => {
    vi.useFakeTimers();
    const send = vi.fn(async () => ({ success: true as const }));
    const queue = new CartUpdateQueue(send, async () => {});
    void queue.request("p", 2, 1);
    expect(await queue.request("p", 1, 1)).toEqual({
      success: true,
      changed: false,
    });
    await vi.runAllTimersAsync();
    expect(send).not.toHaveBeenCalled();
  });
  it("serializes requests and preserves the latest intention during a slow write", async () => {
    vi.useFakeTimers();
    let finish: ((value: { success: true }) => void) | undefined;
    const send = vi.fn(
      () =>
        new Promise<{ success: true }>((resolve) => {
          finish = resolve;
        }),
    );
    const queue = new CartUpdateQueue(send, async () => {});
    void queue.request("p", 2, 1);
    await vi.advanceTimersByTimeAsync(500);
    void queue.request("p", 3, 1);
    void queue.request("p", 4, 1);
    await vi.advanceTimersByTimeAsync(500);
    expect(send).toHaveBeenCalledTimes(1);
    finish?.({ success: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(send).toHaveBeenLastCalledWith("p", 4);
    finish?.({ success: true });
    await vi.advanceTimersByTimeAsync(0);
    const flushed = queue.flush();
    await vi.advanceTimersByTimeAsync(500);
    expect(await flushed).toBe(true);
  });
  it("keeps flush pending through the cooldown before a subsequent removal", async () => {
    vi.useFakeTimers();
    const queue = new CartUpdateQueue(
      async () => ({ success: true }),
      async () => {},
    );
    void queue.request("p", 2, 1);
    await vi.advanceTimersByTimeAsync(500);
    let settled = false;
    const flushed = queue.flush().then((ok) => {
      settled = true;
      return ok;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await flushed).toBe(true);
  });
  it("discards queued work on logout and never refreshes the previous owner", async () => {
    vi.useFakeTimers();
    const send = vi.fn(async () => ({ success: true as const }));
    const refresh = vi.fn(async () => {});
    const queue = new CartUpdateQueue(send, refresh);
    const result = queue.request("p", 2, 1);
    queue.clear();
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ success: false, code: "CANCELLED" });
    expect(send).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("does not retry a failed write and prevents checkout flush from claiming success", async () => {
    vi.useFakeTimers();
    const send = vi.fn(async () => ({
      success: false as const,
      code: "RATE_LIMITED",
    }));
    const queue = new CartUpdateQueue(send, async () => {});
    void queue.request("p", 2, 1);
    await vi.runAllTimersAsync();
    const flushed = queue.flush();
    await vi.advanceTimersByTimeAsync(500);
    expect(await flushed).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
