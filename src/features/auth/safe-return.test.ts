import { expect, it } from "vitest";
import { safeReturn } from "./safe-return";

it("allows internal commerce returns without permitting an open redirect", () => {
  expect(safeReturn("/products/00000000-0000-4000-8000-000000000001")).toBe(
    "/products/00000000-0000-4000-8000-000000000001",
  );
  for (const value of [
    "//evil.test",
    "https://evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
    "/admin",
    null,
    ["/cart"],
    "/cart\r\nLocation:x",
  ])
    expect(safeReturn(value)).toBe("/account");
});
