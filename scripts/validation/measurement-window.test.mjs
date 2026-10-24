import assert from "node:assert/strict";
import test from "node:test";
import { httpMeasurementWindow, measuredPeak } from "./measurement-window.mjs";

test("missing or impossible measurement clocks cannot validate a burst", () => {
  assert.equal(httpMeasurementWindow({}, 10, 20), null);
  assert.equal(
    httpMeasurementWindow(
      {
        metrics: {
          measurement_start_epoch_ms: { value: 9 },
          measurement_end_epoch_ms: { value: 15 },
        },
      },
      10,
      20,
    ),
    null,
  );
});
test("a large warm-up peak never becomes measured concurrency", () => {
  const window = { start: 100, end: 200 };
  assert.equal(
    measuredPeak({ httpRequests: { peakAt: 99, peakInSample: 5000 } }, window),
    0,
  );
  assert.equal(
    measuredPeak({ httpRequests: { peakAt: 150, peakInSample: 10 } }, window),
    10,
  );
  assert.equal(
    measuredPeak({ httpRequests: { peakAt: 201, peakInSample: 5000 } }, window),
    0,
  );
});
