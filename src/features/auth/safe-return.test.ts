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
    null,
    ["/cart"],
    "/cart\r\nLocation:x",
  ])
    expect(safeReturn(value)).toBe("/account");
});

it("preserves canonical account, admin, cart and checkout destinations with queries", () => {
  for (const value of [
    "/",
    "/admin",
    "/admin/catalog?page=3",
    "/account/orders?page=2",
    "/account/payment-methods",
    "/products?query=bolsa&cart=open",
    "/checkout",
    "/account/orders/00000000-0000-4000-8000-000000000001?page=4",
  ])
    expect(safeReturn(value)).toBe(value);
});

it("rejects encoded authorities, controls, login loops and unknown paths", () => {
  for (const value of [
    "/%2f%2fevil.test",
    "/account%5cfoo",
    "/account%0afoo",
    "/login?returnTo=/login",
    "/api/cart",
    "/account#x",
    "/admin/../login",
    "/products\u0000",
    "/account/%ZZ",
    " /cart",
    `/${"a".repeat(1601)}`,
  ])
    expect(safeReturn(value)).toBe("/account");
});
