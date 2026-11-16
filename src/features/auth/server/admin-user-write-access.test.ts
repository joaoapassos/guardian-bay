import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  reserve: vi.fn(),
  slot: vi.fn(),
  hash: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("./require-admin", () => ({
  requireAuthenticatedAdmin: mocks.authorize,
}));
vi.mock("./login-rate-limit", () => ({
  reserveLoginAttempt: mocks.reserve,
  withLoginHashSlot: mocks.slot,
}));
vi.mock("./password", () => ({ hashPassword: mocks.hash }));
vi.mock("./admin-users", () => ({ clearAdminUserListCache: vi.fn() }));

import { createAdminUser } from "./create-admin-user";
import { editAdminUser } from "./edit-admin-user";

beforeEach(() => vi.resetAllMocks());
const userId = "00000000-0000-4000-8000-000000000001";
const data = {
  name: "Pessoa Exemplo",
  email: "pessoa@example.test",
  password: "Senha Segura 123!",
};

it("rejects unauthorized creation and editing before hashing or database writes", async () => {
  mocks.authorize.mockResolvedValue({ success: false, code: "FORBIDDEN" });
  expect(await createAdminUser(data)).toEqual({
    success: false,
    code: "FORBIDDEN",
  });
  expect(await editAdminUser({ ...data, userId })).toEqual({
    success: false,
    code: "FORBIDDEN",
  });
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.slot).not.toHaveBeenCalled();
  expect(mocks.hash).not.toHaveBeenCalled();
});

it("rejects editing the administrator's own account", async () => {
  mocks.authorize.mockResolvedValue({
    success: true,
    identity: { id: userId },
  });
  expect(await editAdminUser({ ...data, userId })).toEqual({
    success: false,
    code: "SELF",
  });
  expect(mocks.slot).not.toHaveBeenCalled();
});
