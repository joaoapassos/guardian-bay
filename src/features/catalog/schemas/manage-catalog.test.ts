import { expect, it } from "vitest";
import { manageCatalogSchema } from "./manage-catalog";

const valid = {
  operation: "create-product",
  name: "Produto",
  description: "<script>plain text</script>",
  categoryId: "00000000-0000-4000-8000-000000000001",
  amount: 1099,
  currency: "BRL",
  isPublished: false,
};
it("revalida preço e rejeita mass assignment administrativo", () => {
  expect(manageCatalogSchema.safeParse(valid).success).toBe(true);
  for (const extra of [
    { passwordHash: "hash" },
    { userId: valid.categoryId },
    { role: "admin" },
    { revision: 1 },
    { id: valid.categoryId },
    { formatted: "R$ 1,00" },
    { amount: 1.5 },
    { currency: "USD" },
  ])
    expect(manageCatalogSchema.safeParse({ ...valid, ...extra }).success).toBe(
      false,
    );
});
