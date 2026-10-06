import { describe, expect, it, vi } from "vitest";

// Unit runner is not Next.js. This replaces only its import marker, not crypto.
vi.mock("server-only", () => ({}));

import { hashPassword, verifyPassword } from "./password";

describe("server password credentials", () => {
  it("uses Argon2id, independent salts and real password verification", async () => {
    const password = "a fictional passphrase";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).toMatch(/^\$argon2id\$v=19\$m=65536,p=1,t=3\$/);
    expect(first).not.toBe(second);
    expect(first.split("$")[4]).not.toBe(second.split("$")[4]);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("a different passphrase", first)).toBe(false);
    expect(await verifyPassword(`${password} `, first)).toBe(false);
  });

  it("supports the maximum Unicode password without truncation", async () => {
    const password = "🔒".repeat(128);
    const encoded = await hashPassword(password);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword(`${"🔒".repeat(127)}🔑`, encoded)).toBe(false);
  });

  it.each([
    undefined,
    null,
    123,
    "",
    "short secret",
    "a".repeat(129),
    "a".repeat(100000),
  ])("rejects invalid creation input with a controlled error", async (value) => {
    await expect(hashPassword(value)).rejects.toThrow("Credencial inválida.");
    try {
      await hashPassword(value);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const caught = error as Error;
      expect(caught.cause).toBeUndefined();
      if (typeof value === "string" && value.length > 0) {
        expect(caught.stack).not.toContain(value);
      }
    }
  });

  it("returns false for invalid verification input before processing a hash", async () => {
    for (const value of [
      undefined,
      123,
      "",
      "a".repeat(129),
      "🔒".repeat(129),
    ]) {
      expect(await verifyPassword(value, "unused")).toBe(false);
    }
  });

  it("does not disclose malformed stored credentials or password in errors", async () => {
    const password = "fictional secret phrase";
    const malformedHash = "$argon2id$v=19$FICTIONAL_HASH";
    try {
      await verifyPassword(password, malformedHash);
      expect.fail("Malformed stored hash must fail");
    } catch (error) {
      const caught = error as Error;
      expect(caught.message).toBe("Não foi possível processar a credencial.");
      expect(caught.cause).toBeUndefined();
      expect(caught.stack).not.toContain(password);
      expect(caught.stack).not.toContain(malformedHash);
    }
  });
});
