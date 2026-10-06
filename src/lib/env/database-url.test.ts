import { describe, expect, it } from "vitest";
import { validateDatabaseUrl } from "./database-url";

describe("validateDatabaseUrl", () => {
  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["spaces", "   "],
    ["whitespace", "\n\t"],
  ])("rejects %s configuration", (_label, value) => {
    expect(() => validateDatabaseUrl(value)).toThrow(
      "Configuração obrigatória ausente: DATABASE_URL",
    );
  });

  it.each([
    ["malformed URL", "not-a-url"],
    ["non-PostgreSQL protocol", "https://localhost/database"],
    ["missing hostname", "postgresql:///database"],
    ["missing database path", "postgresql://localhost"],
    ["empty database path", "postgresql://localhost/"],
    ["non-numeric port", "postgresql://localhost:invalid/database"],
    ["out-of-range port", "postgresql://localhost:65536/database"],
    ["zero port", "postgresql://localhost:0/database"],
    ["leading whitespace", " postgresql://localhost/database"],
    ["trailing whitespace", "postgresql://localhost/database "],
  ])("rejects %s", (_label, value) => {
    expect(() => validateDatabaseUrl(value)).toThrow(
      "Configuração inválida: DATABASE_URL",
    );
  });

  it.each([
    "postgresql://TEST_USER:TEST_PASSWORD@localhost:5432/TEST_DATABASE",
    "postgres://localhost/TEST_DATABASE",
    "postgresql://localhost/TEST_DATABASE?sslmode=require",
    "postgresql://localhost:65535/TEST_DATABASE",
  ])("preserves a valid URL without connecting: %s", (value) => {
    expect(validateDatabaseUrl(value)).toBe(value);
  });

  it("does not expose rejected credentials, host or URL in its error", () => {
    const value =
      "https://FICTIONAL_USER:FICTIONAL_SECRET@internal.invalid/DATABASE";
    let caught: unknown;
    try {
      validateDatabaseUrl(value);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const error = caught as Error;
    expect(error.message).toBe("Configuração inválida: DATABASE_URL");
    expect(error.cause).toBeUndefined();
    for (const sensitive of [
      value,
      "FICTIONAL_USER",
      "FICTIONAL_SECRET",
      "internal.invalid",
    ]) {
      expect(error.stack).not.toContain(sensitive);
    }
  });
});
