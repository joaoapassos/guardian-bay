import { expect, it } from "vitest";
import { catalogReturn } from "./catalog-return";

it("preserves local filters but rejects external or unrelated return destinations", () => {
  expect(catalogReturn("/admin/catalog?page=2&query=kit")).toBe(
    "/admin/catalog?page=2&query=kit",
  );
  for (const value of [
    undefined,
    ["/admin/catalog"],
    "https://evil.test",
    "//evil.test",
    "javascript:alert(1)",
    "/admin/orders",
    "/admin/catalog?redirect=https://evil.test",
    "http://[",
  ])
    expect(catalogReturn(value)).toBe("/admin/catalog");
});
