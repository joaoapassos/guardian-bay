import { createHash } from "node:crypto";
import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
let active = 0;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Shared by the privileged upload and the CLI. Never imported by client UI.
export async function inspectProductImage(bytes, mime) {
  if (
    !Buffer.isBuffer(bytes) ||
    !bytes.length ||
    bytes.length > MAX_IMAGE_BYTES
  )
    throw new Error("INVALID_IMAGE");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) throw new Error("INVALID_IMAGE");
  if (png) {
    for (let offset = 8; offset + 12 <= bytes.length; ) {
      const length = bytes.readUInt32BE(offset);
      if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL")
        throw new Error("INVALID_IMAGE");
      if (length > bytes.length - offset - 12) throw new Error("INVALID_IMAGE");
      offset += length + 12;
    }
  }
  if (active >= 2) throw new Error("MEDIA_BUSY");
  active++;
  try {
    const input = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const metadata = await input.metadata();
    const types = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (
      !types[metadata.format] ||
      types[metadata.format] !== mime ||
      (metadata.pages ?? 1) !== 1 ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > 20_000_000
    )
      throw new Error("INVALID_IMAGE");
    const canonical = await input
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .timeout({ seconds: 10 })
      .toBuffer({ resolveWithObject: true });
    const raw = {
      width: canonical.info.width,
      height: canonical.info.height,
      channels: 4,
    };
    const tiny = await sharp(canonical.data, { raw })
      .removeAlpha()
      .greyscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();
    let bits = 0n;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        bits = (bits << 1n) | (tiny[y * 9 + x] > tiny[y * 9 + x + 1] ? 1n : 0n);
    const output = await sharp(canonical.data, { raw })
      .webp({ quality: 82 })
      .toBuffer();
    if (output.length > MAX_IMAGE_BYTES) throw new Error("INVALID_IMAGE");
    return {
      bytes: output,
      width: raw.width,
      height: raw.height,
      sha256: sha(bytes),
      pixelHash: sha(canonical.data),
      perceptualHash: bits.toString(16).padStart(16, "0"),
    };
  } catch {
    throw new Error("INVALID_IMAGE");
  } finally {
    active--;
  }
}
