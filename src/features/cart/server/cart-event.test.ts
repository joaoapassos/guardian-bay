import { expect, it, vi } from "vitest";
import { cartFailure } from "./cart-event";

vi.mock("server-only", () => ({}));
it("ECMSG-64: logger allowlist não aceita input/erro e sink não interfere", () => {
  const logging = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    cartFailure("add");
    const event = logging.mock.calls[0][0];
    expect(Object.keys(event)).toEqual([
      "event",
      "operation",
      "result",
      "timestamp",
      "correlationId",
    ]);
    expect(event).toMatchObject({
      event: "cart",
      operation: "add",
      result: "OPERATION_FAILED",
    });
    logging.mockImplementation(() => {
      throw new Error("sink unavailable");
    });
    expect(() => cartFailure("read")).not.toThrow();
  } finally {
    logging.mockRestore();
  }
});
