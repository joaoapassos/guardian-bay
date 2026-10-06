import { afterEach, expect, it, vi } from "vitest";
import { securityEvent } from "./security-event";

vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());

it("logs only the allowlist and generates event correlation", () => {
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  securityEvent("login", "LIMIT_REACHED");
  securityEvent("session-read", "OPERATION_FAILED");
  expect(log).toHaveBeenCalledTimes(2);
  const events = log.mock.calls.map(([event]) => event);
  for (const event of events) {
    expect(Object.keys(event).sort()).toEqual([
      "correlationId",
      "event",
      "operation",
      "result",
      "timestamp",
    ]);
    expect(event.event).toBe("authentication");
    expect(event.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
  }
  expect(events[0].correlationId).not.toBe(events[1].correlationId);
});

it("a logging failure cannot replace success or expose its error", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {
    throw new Error("private sink failure");
  });
  expect(() => securityEvent("login", "LIMIT_REACHED")).not.toThrow();
  expect(() => securityEvent("logout", "OPERATION_FAILED")).not.toThrow();
});
