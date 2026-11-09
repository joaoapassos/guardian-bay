import { describe, expect, it } from "vitest";
import {
  adminUserChangeSchema,
  adminUserQuerySchema,
} from "./admin-users.schema";

describe("admin users contracts", () => {
  it("accepts only supported roles and UUID targets", () => {
    expect(
      adminUserChangeSchema.safeParse({
        userId: "a0f1a7e0-8a27-4f22-9e8e-3e16dc725392",
        role: "admin",
      }).success,
    ).toBe(true);
    expect(
      adminUserChangeSchema.safeParse({ userId: "bad", role: "admin" }).success,
    ).toBe(false);
    expect(
      adminUserChangeSchema.safeParse({
        userId: "a0f1a7e0-8a27-4f22-9e8e-3e16dc725392",
        role: "root",
      }).success,
    ).toBe(false);
    expect(
      adminUserChangeSchema.safeParse({
        userId: "a0f1a7e0-8a27-4f22-9e8e-3e16dc725392",
        role: "admin",
        extra: true,
      }).success,
    ).toBe(false);
  });
  it("bounds pagination and role filters", () => {
    expect(adminUserQuerySchema.parse({})).toEqual({
      role: "",
      page: 1,
      search: "",
      sort: "newest",
      status: "",
    });
    expect(
      adminUserQuerySchema.parse({ search: "  Ana  ", sort: "oldest" }).search,
    ).toBe("Ana");
    expect(
      adminUserQuerySchema.safeParse({ search: "a".repeat(101) }).success,
    ).toBe(false);
    expect(adminUserQuerySchema.safeParse({ sort: "other" }).success).toBe(
      false,
    );
    expect(adminUserQuerySchema.safeParse({ status: "unknown" }).success).toBe(
      false,
    );
    expect(adminUserQuerySchema.safeParse({ role: "root" }).success).toBe(
      false,
    );
    expect(adminUserQuerySchema.safeParse({ page: "1001" }).success).toBe(
      false,
    );
  });
});
