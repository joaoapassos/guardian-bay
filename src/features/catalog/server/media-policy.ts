import "server-only";

export { inspectProductImage, MAX_IMAGE_BYTES } from "../image-processing.mjs";

export async function readBoundedUpload(request: Request, limit: number) {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit))
    throw new Error("BODY_TOO_LARGE");
  if (!request.body) throw new Error("INVALID_BODY");
  const reader = request.body.getReader();
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 30000);
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (timedOut) throw new Error("INVALID_BODY");
      if (done) return Buffer.concat(chunks);
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
