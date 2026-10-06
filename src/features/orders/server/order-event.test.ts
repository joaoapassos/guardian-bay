import { expect, it, vi } from "vitest";
import { orderFailure } from "./order-event";

vi.mock("server-only", () => ({}));
it("ECMSG-77: log allowlist mínimo e sink sem impacto", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    orderFailure("create");
    expect(Object.keys(warn.mock.calls[0][0])).toEqual([
      "event",
      "operation",
      "result",
      "timestamp",
      "correlationId",
    ]);
    expect(warn.mock.calls[0][0]).toMatchObject({
      event: "order",
      operation: "create",
      result: "OPERATION_FAILED",
    });
    warn.mockImplementation(() => {
      throw new Error("Sink unavailable");
    });
    expect(() => orderFailure("detail")).not.toThrow();
  } finally {
    warn.mockRestore();
  }
});
