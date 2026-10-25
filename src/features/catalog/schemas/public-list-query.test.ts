import { expect, it } from "vitest";
import { publicListQuerySchema } from "./list-query";

it("parses BRL prices exactly and rejects invalid ranges/extra authority", () => {
  const result = publicListQuerySchema.parse({
    minPrice: "12,30",
    maxPrice: "99.99",
    availability: "in-stock",
  });
  expect(result.minPrice).toBe(1230);
  expect(result.maxPrice).toBe(9999);
  for (const value of [
    { minPrice: "100", maxPrice: "10" },
    { minPrice: "1e3" },
    { maxPrice: "0.001" },
    { availability: "private" },
    { userId: "other" },
  ])
    expect(publicListQuerySchema.safeParse(value).success).toBe(false);
});
