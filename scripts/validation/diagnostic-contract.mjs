import assert from "node:assert/strict";

export function recoveryPassed(samples, referenceP95) {
  return (
    Number.isFinite(referenceP95) &&
    referenceP95 > 0 &&
    samples.length >= 10 &&
    samples
      .slice(-10)
      .every(
        (sample) =>
          sample.status === 200 &&
          Number.isFinite(sample.ms) &&
          sample.ms >= 0 &&
          sample.ms <= referenceP95 * 1.2,
      )
  );
}

export function selectedLevel(value) {
  assert.match(
    value ?? "",
    /^(100|250|500|1000)$/,
    "Explicit single level required: 100, 250, 500 or 1000; no automatic escalation",
  );
  return Number(value);
}

export function errorClass(value) {
  // Never retain messages, stack traces, SQL, headers or URLs.
  const matches = String(value).match(
    /\b(ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOBUFS|EMFILE|ENFILE|EADDRNOTAVAIL|EPIPE)\b/,
  );
  return matches?.[1] ?? "UNCLASSIFIED";
}

export function instancePorts(value = "1") {
  assert.ok(
    ["1", "2", "4", "8", "16"].includes(value),
    "Only one, two, four, eight or sixteen owned local instances are supported",
  );
  return Array.from({ length: Number(value) }, (_, i) => 3139 + i);
}

export function proxyBacklog(value = "511") {
  assert.ok(
    ["511", "2048"].includes(value),
    "Unapproved local listener backlog",
  );
  return Number(value);
}
