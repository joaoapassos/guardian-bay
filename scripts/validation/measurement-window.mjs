export function httpMeasurementWindow(summary, runStart, runEnd) {
  const start = summary?.metrics?.measurement_start_epoch_ms?.value;
  const end = summary?.metrics?.measurement_end_epoch_ms?.value;
  if (
    ![start, end].every(Number.isFinite) ||
    start < runStart ||
    end < start ||
    end > runEnd
  )
    return null;
  return { start, end };
}

export function measuredPeak(sample, window) {
  if (!window) return 0;
  const timing = sample.httpRequests;
  return Number.isFinite(timing?.peakAt) &&
    timing.peakAt >= window.start &&
    timing.peakAt <= window.end
    ? timing.peakInSample
    : 0;
}
