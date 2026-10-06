import { describe, expect, it } from "vitest";
import {
  credentialSchema,
  emailSchema,
  passwordSchema,
} from "./credential.schema";

describe("identity and credential inputs", () => {
  it("normalizes only surrounding whitespace and email case", () => {
    expect(emailSchema.parse("  Person+tag@Example.COM  ")).toBe(
      "person+tag@example.com",
    );
    expect(emailSchema.parse("person.name@example.com")).toBe(
      "person.name@example.com",
    );
  });

  it.each([
    "",
    "not-an-email",
    "a b@example.com",
    "josé@example.com",
    "K@example.com",
    "a@例子.com",
    "a".repeat(321),
  ])("rejects invalid email without querying persistence", (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });

  it("rejects fields that could claim authority", () => {
    expect(
      credentialSchema.safeParse({
        email: "person@example.com",
        password: "a long passphrase",
        passwordHash: "client-chosen-hash",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("enforces the persisted email length after normalization", () => {
    const prefix = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.`;
    const valid = `${prefix}${"d".repeat(57)}.com`;
    expect(valid.length).toBe(254);
    expect(emailSchema.parse(valid)).toBe(valid);
    expect(
      emailSchema.safeParse(`${prefix}${"d".repeat(58)}.com`).success,
    ).toBe(false);
  });

  it("accepts passphrases, Unicode and spaces without changing passwords", () => {
    for (const value of [
      "a".repeat(15),
      "🔒".repeat(128),
      "  a passphrase with spaces  ",
    ]) {
      expect(passwordSchema.parse(value)).toBe(value);
    }
  });

  it.each([
    undefined,
    null,
    123,
    "",
    "a".repeat(14),
    "a".repeat(129),
    "🔒".repeat(129),
    "a".repeat(100000),
    `valid passphrase\uD800`,
  ])("rejects invalid password inputs or lengths", (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});
