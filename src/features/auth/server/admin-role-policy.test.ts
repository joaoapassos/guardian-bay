import { describe, expect, it } from "vitest";
import { canManageUser } from "./admin-role-policy";

describe("administrative role hierarchy", () => {
  it("allows admins to manage customers only", () => {
    expect(canManageUser("admin", "customer")).toBe(true);
    expect(canManageUser("admin", "admin")).toBe(false);
    expect(canManageUser("admin", "superadmin")).toBe(false);
  });
  it("allows superadmins to manage other roles and denies unknown actors", () => {
    for (const role of ["customer", "admin", "superadmin"]) {
      expect(canManageUser("superadmin", role)).toBe(true);
    }
    expect(canManageUser("customer", "customer")).toBe(false);
    expect(canManageUser("admin", "unknown")).toBe(false);
  });
});
