import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { openPersonalData, sealPersonalData } from "./personal-data";

afterEach(() => vi.unstubAllEnvs());
describe("protected personal data", () => {
  it("authenticates owner context, randomizes ciphertext and supports key rotation", () => {
    vi.stubEnv("BUYER_DATA_ACTIVE_KEY_ID", "test1");
    vi.stubEnv(
      "BUYER_DATA_KEYS",
      JSON.stringify({
        test1: Buffer.alloc(32, 1).toString("base64"),
        test2: Buffer.alloc(32, 2).toString("base64"),
      }),
    );
    const first = sealPersonalData("private-test-value", "profile:owner1");
    expect(first).not.toContain("private-test-value");
    expect(first).not.toBe(
      sealPersonalData("private-test-value", "profile:owner1"),
    );
    expect(openPersonalData(first, "profile:owner1")).toBe(
      "private-test-value",
    );
    expect(() => openPersonalData(first, "profile:owner2")).toThrow();
    vi.stubEnv("BUYER_DATA_ACTIVE_KEY_ID", "test2");
    expect(openPersonalData(first, "profile:owner1")).toBe(
      "private-test-value",
    );
    const parts = first.split(".");
    parts[3] = Buffer.alloc(16).toString("base64url");
    expect(() => openPersonalData(parts.join("."), "profile:owner1")).toThrow();
  });
  it("fails closed without configured keys", () => {
    vi.stubEnv("BUYER_DATA_KEYS", "");
    expect(() => sealPersonalData("value", "owner")).toThrow();
  });
});
