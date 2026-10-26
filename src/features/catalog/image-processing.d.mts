import type { Buffer } from "node:buffer";
export const MAX_IMAGE_BYTES: number;
export function inspectProductImage(
  bytes: Buffer,
  mime: string,
): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  sha256: string;
  pixelHash: string;
  perceptualHash: string;
}>;
