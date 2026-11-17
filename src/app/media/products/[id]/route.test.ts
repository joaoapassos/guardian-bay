import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/catalog/server/read-product-image", () => ({
  readProductImage: mocks.read,
}));

import { GET } from "./route";

const request = new Request("http://localhost/media/products/example");
const params = { params: Promise.resolve({ id: "example" }) };
beforeEach(() => vi.resetAllMocks());

it("retorna 200 e dados de imagem para mídia disponível", async () => {
  mocks.read.mockResolvedValue({ bytes: Buffer.from("image"), public: true });
  const response = await GET(request, params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/webp");
});

it("retorna 404 para mídia ausente ou sem acesso", async () => {
  mocks.read.mockResolvedValueOnce(null);
  expect((await GET(request, params)).status).toBe(404);
});

it("retorna 503 sem expor detalhes se o armazenamento ou banco falhar", async () => {
  mocks.read.mockRejectedValue(new Error("private database detail"));
  const response = await GET(request, params);
  expect(response.status).toBe(503);
  expect(await response.text()).toBe("");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("não confunde erro ENOENT de outro serviço com ausência da mídia", async () => {
  mocks.read.mockRejectedValue(
    Object.assign(new Error("backend"), { code: "ENOENT" }),
  );
  expect((await GET(request, params)).status).toBe(503);
});
