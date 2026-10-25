import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  rows: [] as Record<string, unknown>[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/server/require-admin", () => ({
  requireAuthenticatedAdmin: mocks.authorize,
}));
vi.mock("@/db", () => ({ getDb: () => ({ transaction: mocks.transaction }) }));

import { readAdminCategories } from "./read-admin-categories";
import { readAdminProduct } from "./read-admin-product";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Fixture" },
  ];
  const chain = {
    from: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: async () => mocks.rows,
  };
  mocks.select.mockReturnValue(chain);
  mocks.transaction.mockImplementation(async (operation) =>
    operation({ select: mocks.select }),
  );
  mocks.authorize.mockResolvedValue({
    success: true,
    identity: { id: "admin" },
  });
});
const productId = "00000000-0000-4000-8000-000000000001";
for (const [label, read] of [
  ["categories", () => readAdminCategories()],
  ["product", () => readAdminProduct(productId)],
] as const) {
  it(`${label}: denies access before querying protected data`, async () => {
    mocks.authorize.mockResolvedValue({ success: false, code: "FORBIDDEN" });
    expect(await read()).toEqual({ success: false, code: "FORBIDDEN" });
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it(`${label}: discards data when authorization expires during reading`, async () => {
    mocks.authorize
      .mockResolvedValueOnce({ success: true, identity: { id: "admin" } })
      .mockResolvedValueOnce({ success: false, code: "UNAUTHENTICATED" });
    expect(await read()).toEqual({ success: false, code: "UNAUTHENTICATED" });
  });
}
it("rejects malformed product IDs before opening a transaction", async () => {
  expect(await readAdminProduct("../../secret")).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
  expect(mocks.transaction).not.toHaveBeenCalled();
});
it("distinguishes a missing product from an authorization failure", async () => {
  mocks.rows = [];
  expect(await readAdminProduct(productId)).toEqual({
    success: false,
    code: "NOT_FOUND",
  });
});
it("makes category truncation explicit instead of implying a complete result", async () => {
  mocks.rows = Array.from({ length: 101 }, (_, index) => ({
    id: String(index),
    name: `Category ${index}`,
  }));
  const result = await readAdminCategories();
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.categories).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  }
});
