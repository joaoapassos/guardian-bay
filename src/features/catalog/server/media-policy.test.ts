import sharp from "sharp";
import { expect, it, vi } from "vitest";
import { inspectProductImage, readBoundedUpload } from "./media-policy";

vi.mock("server-only", () => ({}));
it("decodes allowed bytes, strips metadata and generates bounded WebP", async () => {
  const bytes = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const result = await inspectProductImage(bytes, "image/jpeg");
  expect(result.width).toBe(40);
  expect(result.height).toBe(20);
  const metadata = await sharp(result.bytes).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.exif).toBeUndefined();
  expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(result.perceptualHash).toMatch(/^[a-f0-9]{16}$/);
  await expect(inspectProductImage(bytes, "image/png")).rejects.toThrow();
});
it("rejects SVG, invalid bytes, oversized files and excessive dimensions", async () => {
  for (const bytes of [
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    ),
    Buffer.from("not image"),
    Buffer.alloc(5242881),
  ])
    await expect(inspectProductImage(bytes, "image/png")).rejects.toThrow();
  const large = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await expect(inspectProductImage(large, "image/png")).rejects.toThrow();
});
it("bounds multipart streams without trusting Content-Length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(100));
      controller.enqueue(new Uint8Array(100));
      controller.close();
    },
  });
  await expect(
    readBoundedUpload(
      new Request("http://localhost", {
        method: "POST",
        body,
        duplex: "half",
      } as RequestInit),
      150,
    ),
  ).rejects.toThrow();
});
it("rejects animated PNG and a third concurrent decode instead of queueing", async () => {
  const bytes = await sharp({
    create: { width: 30, height: 20, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const animation = Buffer.alloc(20);
  animation.writeUInt32BE(8);
  animation.write("acTL", 4);
  animation.writeUInt32BE(2, 8);
  await expect(
    inspectProductImage(
      Buffer.concat([bytes.subarray(0, 33), animation, bytes.subarray(33)]),
      "image/png",
    ),
  ).rejects.toThrow("INVALID_IMAGE");
  const first = inspectProductImage(bytes, "image/png");
  const second = inspectProductImage(bytes, "image/png");
  await expect(inspectProductImage(bytes, "image/png")).rejects.toThrow(
    "MEDIA_BUSY",
  );
  await Promise.all([first, second]);
});
