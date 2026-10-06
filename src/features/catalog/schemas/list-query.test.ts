import { expect, it } from "vitest";
import { listQuerySchema } from "./list-query";

it("valida URL limitada sem campos de autoridade ou SQL arbitrário", () => {
  expect(
    listQuerySchema.parse({ query: "  kit  ", sort: "price-asc", limit: "50" }),
  ).toMatchObject({ query: "kit", page: 1, limit: 50 });
  for (const input of [
    { query: "x".repeat(101) },
    { sort: "amount; DROP TABLE users" },
    { category: "invalid" },
    { page: "1001" },
    { limit: "99999" },
    { query: ["a", "b"] },
    { amount: 1 },
    { currency: "USD" },
    { role: "admin" },
  ])
    expect(listQuerySchema.safeParse(input).success).toBe(false);
});
