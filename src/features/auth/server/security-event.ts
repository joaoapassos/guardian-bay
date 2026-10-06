import "server-only";
import { randomUUID } from "node:crypto";

// No input/error object parameter: event fields are deliberately allowlisted.
export function securityEvent(
  operation:
    | "login"
    | "register"
    | "password-change"
    | "session-create"
    | "session-read"
    | "session-activity"
    | "logout"
    | "identity-read",
  result: "LIMIT_REACHED" | "OPERATION_FAILED" | "CREDENTIAL_CHANGED",
) {
  try {
    console.warn({
      event: "authentication",
      operation,
      result,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
    });
  } catch {
    // Logging is best effort; it never changes the operation's result.
  }
}
