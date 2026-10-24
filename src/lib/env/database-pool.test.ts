import { describe, expect, it } from "vitest";
import { parseDatabasePoolMax } from "./database-pool";

describe("database connection budget", () => {
  it("preserves the installed driver default and accepts smaller budgets", () => {
    expect(parseDatabasePoolMax(undefined)).toBe(10);
    expect(parseDatabasePoolMax("5")).toBe(5);
    expect(parseDatabasePoolMax("1")).toBe(1);
  });
  it("rejects malformed or excessive budgets without exposing their value", () => {
    for (const value of [
      "",
      "0",
      "11",
      "5.0",
      "+5",
      "05",
      " 5 ",
      "NaN",
      "Infinity",
      "secret-value",
    ])
      expect(() => parseDatabasePoolMax(value)).toThrow(
        "Configuração inválida: DATABASE_POOL_MAX",
      );
  });
});
