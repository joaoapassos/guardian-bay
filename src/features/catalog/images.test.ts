import { expect, it } from "vitest";
import { imageKeySchema, productImage } from "./images";
import { manageCatalogSchema } from "./schemas/manage-catalog";

it("resolve somente assets de allowlist com fallback local", () => {
  expect(productImage("lock", "Produto")).toEqual({
    kind: "none",
    key: "lock",
    alt: "Sem imagem de Produto",
  });
  expect(productImage("shield", "Produto")).toMatchObject({
    kind: "none",
    key: "shield",
  });
  for (const key of [
    null,
    "../../secret",
    "javascript:alert(1)",
    "data:image/svg+xml,x",
    "file:///secret",
    "https://evil.test/image",
    "/catalog/lock.svg",
  ]) {
    expect(imageKeySchema.safeParse(key).success).toBe(false);
    expect(productImage(key, "<script>")).toMatchObject({
      kind: "none",
      key: null,
    });
    expect(
      manageCatalogSchema.safeParse({
        operation: "create-product",
        name: "Teste",
        description: "",
        categoryId: "00000000-0000-4000-8000-000000000001",
        amount: 100,
        currency: "BRL",
        isPublished: false,
        imageKey: key,
      }).success,
    ).toBe(key === null);
  }
});
