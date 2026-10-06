import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readIdentitySchema } from "./read-identity.schema";

describe("protected identity request", () => {
  it("accepts only the resource UUID, canonicalized", () => {
    const userId = randomUUID();
    expect(readIdentitySchema.parse({ userId: userId.toUpperCase() })).toEqual({
      userId,
    });
  });
  it.each([
    undefined,
    null,
    {},
    { userId: "invalid" },
    { userId: "x".repeat(100000) },
    { userId: randomUUID(), role: "admin" },
    { userId: randomUUID(), token: "forged" },
  ])("rejects malformed input and authority fields", (input) => {
    expect(readIdentitySchema.safeParse(input).success).toBe(false);
  });
});
