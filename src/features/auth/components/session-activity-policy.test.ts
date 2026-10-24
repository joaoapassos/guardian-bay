import { expect, it, vi } from "vitest";
import { createActivityReporter } from "./session-activity-policy";

it("reports the first visible interaction immediately and throttles later ones without payload", async () => {
  const state = { now: 0, visible: true };
  const send = vi.fn(async () => ({ success: true }));
  const report = createActivityReporter(send, () => state);
  await report();
  expect(send).toHaveBeenCalledExactlyOnceWith();
  state.now = 299999;
  await report();
  expect(send).toHaveBeenCalledTimes(1);
  state.now = 300000;
  state.visible = false;
  await report();
  expect(send).toHaveBeenCalledTimes(1);
  state.visible = true;
  await report();
  await report();
  expect(send).toHaveBeenCalledTimes(2);
});
it("coalesces in-flight events", async () => {
  const state = { now: 0, visible: true };
  let finish: ((value: { success: boolean }) => void) | undefined;
  const send = vi.fn(
    () =>
      new Promise<{ success: boolean }>((resolve) => {
        finish = resolve;
      }),
  );
  const report = createActivityReporter(send, () => state);
  state.now = 300000;
  const first = report();
  await report();
  expect(send).toHaveBeenCalledTimes(1);
  finish?.({ success: false });
  await first;
  expect(send).toHaveBeenCalledTimes(1);
});
it("a renewed cookie can be checked on a later interaction without remounting the layout", async () => {
  const state = { now: 0, visible: true };
  const send = vi
    .fn()
    .mockResolvedValueOnce({ success: false })
    .mockResolvedValueOnce({ success: true });
  const report = createActivityReporter(send, () => state);
  await report();
  await report();
  expect(send).toHaveBeenCalledTimes(1);
  state.now = 300000;
  await report();
  expect(send).toHaveBeenCalledTimes(2);
});
it("network failures do not trigger retries or a background timer", async () => {
  const state = { now: 0, visible: true };
  const send = vi.fn().mockRejectedValue(new Error("offline"));
  const report = createActivityReporter(send, () => state);
  state.now = 300000;
  await report();
  await report();
  expect(send).toHaveBeenCalledTimes(1);
  state.now = 600000;
  await report();
  expect(send).toHaveBeenCalledTimes(2);
});
