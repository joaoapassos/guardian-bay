import "server-only";
import { randomUUID } from "node:crypto";

export function cartFailure(operation: "read" | "add" | "update" | "remove") {
  try {
    console.warn({
      event: "cart",
      operation,
      result: "OPERATION_FAILED",
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
    });
  } catch {
    /* Best effort sink, never an authority. */
  }
}
