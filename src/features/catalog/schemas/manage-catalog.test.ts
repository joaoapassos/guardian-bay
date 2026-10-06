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

it("ECMSG-103: todas as operações administrativas rejeitam autoridade fora do contrato", () => {
  const id = valid.categoryId;
  for (const input of [
    { operation: "create-category", name: "Category" },
    { operation: "update-category", id, revision: 1, name: "Category" },
    valid,
    { ...valid, operation: "update-product", id, revision: 1 },
  ]) {
    expect(manageCatalogSchema.safeParse(input).success).toBe(true);
    for (const key of [
      "role",
      "userId",
      "ownerId",
      "price",
      "paymentStatus",
      "orderStatus",
      "availableQuantity",
      "inventoryRevision",
      "snapshot",
      "checkoutKey",
      "total",
      "items",
    ])
      expect(
        manageCatalogSchema.safeParse({ ...input, [key]: "forged" }).success,
      ).toBe(false);
  }
});
