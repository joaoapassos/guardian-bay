import { expect, it } from "vitest";
import { productImage } from "./images";

const media = {
  id: "00000000-0000-4000-8000-000000000001",
  origin: "upload",
  width: 800,
  height: 600,
  storageKey: "private.webp",
  uploadedBy: "private",
  sha256: "private",
};
it("exposes only an opaque image DTO and never storage or ownership", () => {
  expect(productImage(null, "Mochila", media)).toEqual({
    kind: "upload",
    id: media.id,
    src: `/media/products/${media.id}`,
    alt: "Mochila",
    width: 800,
    height: 600,
  });
});
it("rejects malformed media and preserves a neutral placeholder", () => {
  for (const invalid of [
    null,
    { ...media, origin: "remote", remoteUrl: "https://example.com/image.jpg" },
    { ...media, width: 0 },
    { ...media, id: "../secret" },
    { ...media, height: 999999 },
  ])
    expect(productImage(null, "Produto", invalid).kind).toBe("none");
});
