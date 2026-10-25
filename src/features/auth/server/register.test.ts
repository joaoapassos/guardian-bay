import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./login-rate-limit", () => ({
  reserveLoginAttempt: vi.fn(),
  withLoginHashSlot: vi.fn(),
}));
vi.mock("./password", () => ({ hashPassword: vi.fn() }));

import { reserveLoginAttempt, withLoginHashSlot } from "./login-rate-limit";
import { hashPassword } from "./password";
import { register } from "./register";

describe("registration rejects bypassed UI password rules before privileged work", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    "onlylowercase123!",
    "ONLYUPPERCASE123!",
    "NoNumbersAtAll!!",
    "NoSymbolsHere123",
  ])("rejects %s at the server operation", async (password) => {
    expect(await register({ email: "person@example.test", password })).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(reserveLoginAttempt).not.toHaveBeenCalled();
    expect(withLoginHashSlot).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });
});
