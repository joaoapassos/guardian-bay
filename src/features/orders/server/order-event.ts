import "server-only";
import { randomUUID } from "node:crypto";
export function orderFailure(
  operation:
    | "preview"
    | "create"
    | "history"
    | "detail"
    | "admin-list"
    | "admin-detail",
) {
  try {
    console.warn({
      event: "order",
      operation,
      result: "OPERATION_FAILED",
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
    });
  } catch {
    /* Best effort, no payload or raw Error. */
  }
}
