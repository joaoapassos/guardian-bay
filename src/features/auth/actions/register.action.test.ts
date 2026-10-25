import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/register", () => ({ register: vi.fn() }));
vi.mock("../server/require-same-origin", () => ({
  requireSameOrigin: vi.fn(),
}));
vi.mock("./login.action", () => ({ loginAction: vi.fn() }));

import { register } from "../server/register";
import { requireSameOrigin } from "../server/require-same-origin";
import { loginAction } from "./login.action";
import { registerAction } from "./register.action";

const input = {
  email: "person@example.test",
  password: "Safe registration 42!",
};

describe("registration establishes a verified session", () => {
  beforeEach(() => vi.resetAllMocks());

  it("authenticates after creation and returns only a minimal success DTO", async () => {
    vi.mocked(register).mockResolvedValue({ success: true });
    vi.mocked(loginAction).mockResolvedValue({ success: true });
    expect(await registerAction(input)).toEqual({ success: true });
    expect(requireSameOrigin).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith(input);
    expect(loginAction).toHaveBeenCalledWith(input);
  });

  it("cannot turn a duplicate registration with wrong credentials into success", async () => {
    vi.mocked(register).mockResolvedValue({ success: true });
    vi.mocked(loginAction).mockResolvedValue({
      success: false,
      message: "Credenciais inválidas.",
    });
    expect(await registerAction(input)).toEqual({
      success: false,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("preserves rate limiting when creation succeeded but authentication is limited", async () => {
    vi.mocked(register).mockResolvedValue({ success: true });
    vi.mocked(loginAction).mockResolvedValue({
      success: false,
      code: "RATE_LIMITED",
      message: "Aguarde.",
    });
    expect(await registerAction(input)).toEqual({
      success: false,
      code: "RATE_LIMITED",
    });
  });

  it("does not authenticate when registration is rejected", async () => {
    vi.mocked(register).mockResolvedValue({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(await registerAction(input, "extra")).toEqual({
      success: false,
      code: "INVALID_INPUT",
    });
    expect(register).toHaveBeenCalledWith(undefined);
    expect(loginAction).not.toHaveBeenCalled();
  });

  it("checks request origin before either operation", async () => {
    vi.mocked(requireSameOrigin).mockRejectedValue(
      new Error("Requisição inválida."),
    );
    await expect(registerAction(input)).rejects.toThrow("Requisição inválida.");
    expect(register).not.toHaveBeenCalled();
    expect(loginAction).not.toHaveBeenCalled();
  });

  it("does not report success if session establishment fails", async () => {
    vi.mocked(register).mockResolvedValue({ success: true });
    vi.mocked(loginAction).mockRejectedValue(
      new Error("Authentication failed"),
    );
    await expect(registerAction(input)).rejects.toThrow(
      "Authentication failed",
    );
  });
});
