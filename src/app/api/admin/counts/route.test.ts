import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ count: vi.fn() }));
vi.mock("@/features/admin/server/count-records", () => ({
  countAdminRecords: mocks.count,
}));

import { GET } from "./route";

beforeEach(() => vi.resetAllMocks());

it("returns only totals with private no-store headers", async () => {
  const totals = { products: 1, categories: 2, orders: 3, users: 4 };
  mocks.count.mockResolvedValue({ success: true, totals });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual(totals);
});

it.each([
  ["UNAUTHENTICATED", 401],
  ["FORBIDDEN", 403],
])("denies %s without exposing totals", async (code, status) => {
  mocks.count.mockResolvedValue({ success: false, code });
  const response = await GET();
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ code });
});

it("does not expose server errors", async () => {
  mocks.count.mockRejectedValue(new Error("secret"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "UNAVAILABLE" });
});
