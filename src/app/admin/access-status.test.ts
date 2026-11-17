import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  forbidden: vi.fn(() => {
    throw new Error("HTTP_403");
  }),
}));
vi.mock("next/navigation", () => ({
  forbidden: mocks.forbidden,
  redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/features/auth/server/require-admin", () => ({
  requireAuthenticatedAdmin: mocks.access,
}));
vi.mock("@/features/auth/server/session-cookie", () => ({
  getAuthenticatedIdentity: vi.fn(),
}));
vi.mock("@/features/auth/components/user-menu", () => ({
  UserMenu: () => null,
}));
vi.mock("./_components/admin-navigation", () => ({
  AdminNavigation: () => null,
}));

import { AccessState } from "./_components/access-state";
import AdminLayout from "./layout";

it("interrompe a renderização administrativa sem permissão com o fallback 403", async () => {
  mocks.access.mockResolvedValue({ success: false, code: "FORBIDDEN" });
  await expect(AdminLayout({ children: null })).rejects.toThrow("HTTP_403");
  expect(mocks.forbidden).toHaveBeenCalled();
});
it("aplica a mesma resposta quando a permissão é revogada durante a leitura", () => {
  expect(() => AccessState({ code: "FORBIDDEN" })).toThrow("HTTP_403");
});
