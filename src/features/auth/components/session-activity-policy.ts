// Client scheduling is an optimization, never session authority.
export function createActivityReporter(
  send: () => Promise<{ success: boolean }>,
  readState: () => { now: number; visible: boolean },
) {
  let lastAttempt: number | null = null;
  let pending = false;
  return async () => {
    const { now, visible } = readState();
    if (
      pending ||
      !visible ||
      !Number.isFinite(now) ||
      (lastAttempt !== null && now - lastAttempt < 5 * 60 * 1000)
    )
      return;
    lastAttempt = now;
    pending = true;
    try {
      await send();
    } catch {
      /* Retry only on a later real interaction after the throttle window. */
    } finally {
      pending = false;
    }
  };
}
