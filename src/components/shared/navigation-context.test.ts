import { expect, it } from "vitest";
import { navigationContext } from "./navigation-context";

it("recognizes only the actual admin route family", () => {
  expect(navigationContext("/admin")).toBe("admin");
  expect(navigationContext("/admin/catalog/abc")).toBe("admin");
  for (const path of [
    "/",
    "/administrator",
    "/login",
    "/account",
    "/products",
  ]) {
    expect(navigationContext(path)).toBe("store");
  }
});
