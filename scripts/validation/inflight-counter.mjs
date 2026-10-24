export function createInflightCounter() {
  let current = 0;
  let peak = 0;
  let started = 0;
  let completed = 0;
  let peakInSample = 0;
  let peakAt = 0;
  return {
    start() {
      current++;
      started++;
      peak = Math.max(peak, current);
      if (current > peakInSample) {
        peakInSample = current;
        peakAt = Date.now();
      }
      let finished = false;
      return () => {
        if (finished) return;
        finished = true;
        current--;
        completed++;
      };
    },
    snapshot: () => ({ current, peak, started, completed }),
    sample() {
      const result = { current, peakInSample, peakAt, started, completed };
      peakInSample = current;
      peakAt = Date.now();
      return result;
    },
  };
}
