import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-admin", () => ({
  requireAuthenticatedAdmin: mocks.authorize,
}));
vi.mock("@/db", () => ({ getDb: () => ({ transaction: mocks.transaction }) }));

import { countAdminRecords } from "./count-records";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authorize.mockResolvedValue({
    success: true,
    identity: { id: "admin" },
  });
  mocks.select.mockReturnValue({ from: async () => [{ total: 123 }] });
  mocks.transaction.mockImplementation(async (operation) =>
    operation({ select: mocks.select }),
  );
});

it("counts requested records without applying list filters", async () => {
  expect(await countAdminRecords(["products", "users"])).toEqual({
    success: true,
    totals: { products: 123, users: 123 },
  });
  expect(mocks.select).toHaveBeenCalledTimes(2);
});

it("does not query for a non-admin and discards counts after authorization expires", async () => {
  mocks.authorize.mockResolvedValueOnce({ success: false, code: "FORBIDDEN" });
  expect(await countAdminRecords(["orders"])).toEqual({
    success: false,
    code: "FORBIDDEN",
  });
  expect(mocks.select).not.toHaveBeenCalled();
  mocks.authorize
    .mockResolvedValueOnce({ success: true })
    .mockResolvedValueOnce({ success: false, code: "UNAUTHENTICATED" });
  expect(await countAdminRecords(["orders"])).toEqual({
    success: false,
    code: "UNAUTHENTICATED",
  });
});
