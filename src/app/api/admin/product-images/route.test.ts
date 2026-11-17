import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/features/catalog/server/upload-product-image", () => ({
  uploadProductImage: mocks.upload,
}));

import { POST } from "./route";

const request = new Request("http://localhost/api/admin/product-images", {
  method: "POST",
});
beforeEach(() => vi.resetAllMocks());

it.each([
  ["UNAUTHENTICATED", 401],
  ["FORBIDDEN", 403],
  ["INVALID_IMAGE", 400],
  ["BODY_TOO_LARGE", 413],
  ["RATE_LIMITED", 429],
  ["UPLOAD_UNAVAILABLE", 503],
])("mapeia %s para %i", async (code, expected) => {
  mocks.upload.mockResolvedValue({ success: false, code });
  expect((await POST(request)).status).toBe(expected);
});
it("retorna 201 ao criar a imagem", async () => {
  mocks.upload.mockResolvedValue({ success: true });
  expect((await POST(request)).status).toBe(201);
});
