import { expect, it } from "vitest";
import { adminOrderQuerySchema } from "./admin-order-query";

it("ECMSG-100: filtros limitados, status/sort allowlisted e UUID exato", () => {
  expect(adminOrderQuerySchema.parse({})).toMatchObject({
    page: 1,
    limit: 20,
    sort: "created-desc",
  });
  for (const input of [
    { page: "0" },
    { page: "1001" },
    { limit: "51" },
    { limit: "0" },
    { page: "1e2" },
    { page: ["1", "2"] },
    { sort: "created_at; DROP TABLE orders" },
    { status: "SHIPPED" },
    { orderId: "' OR 1=1 --" },
    { userId: "forged" },
    { query: "a".repeat(101) },
  ])
    expect(adminOrderQuerySchema.safeParse(input).success).toBe(false);
  expect(
    adminOrderQuerySchema.safeParse({
      status: "PAID",
      sort: "created-asc",
      page: "1000",
      limit: "50",
    }).success,
  ).toBe(true);
});
