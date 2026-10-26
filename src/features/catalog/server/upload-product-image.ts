import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { productMedia } from "@/db/schema/product-media";
import { requireAuthenticatedAdmin } from "@/features/auth/server/require-admin";
import { requireSameOrigin } from "@/features/auth/server/require-same-origin";
import { reserveAbuseBudget } from "@/lib/abuse/server";
import { productImage } from "../images";
import {
  inspectProductImage,
  MAX_IMAGE_BYTES,
  readBoundedUpload,
} from "./media-policy";
import { removeMedia, storeMedia } from "./media-storage";

export async function uploadProductImage(request: Request) {
  try {
    await requireSameOrigin();
  } catch {
    return { success: false as const, code: "FORBIDDEN" as const };
  }
  let stored: string | undefined;
  try {
    const access = await getDb().transaction(async (tx) => {
      const auth = await requireAuthenticatedAdmin(tx);
      if (!auth.success)
        return { success: false as const, code: "FORBIDDEN" as const };
      if (!(await reserveAbuseBudget(tx, auth.identity.id, "admin.media")))
        return { success: false as const, code: "RATE_LIMITED" as const };
      return auth;
    });
    if (!access.success) return access;
    const type = request.headers.get("content-type") ?? "";
    if (!type.toLowerCase().startsWith("multipart/form-data;"))
      return { success: false as const, code: "INVALID_IMAGE" as const };
    const bytes = await readBoundedUpload(request, MAX_IMAGE_BYTES + 65536);
    const form = await new Response(bytes, {
      headers: { "content-type": type },
    }).formData();
    const entries = [...form.entries()];
    if (
      entries.length !== 1 ||
      entries[0][0] !== "file" ||
      !(entries[0][1] instanceof File)
    )
      return { success: false as const, code: "INVALID_IMAGE" as const };
    const file = entries[0][1];
    if (file.size > MAX_IMAGE_BYTES)
      return { success: false as const, code: "BODY_TOO_LARGE" as const };
    const image = await inspectProductImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    const id = randomUUID();
    const key = `${id}.webp`;
    const result = await getDb().transaction(async (tx) => {
      const fresh = await requireAuthenticatedAdmin(tx);
      if (!fresh.success || fresh.identity.id !== access.identity.id)
        return { success: false as const, code: "FORBIDDEN" as const };
      await storeMedia(key, image.bytes);
      stored = key;
      await tx.insert(productMedia).values({
        id,
        origin: "upload",
        storageKey: key,
        mime: "image/webp",
        width: image.width,
        height: image.height,
        byteSize: image.bytes.length,
        uploadedBy: fresh.identity.id,
        expiresAt: new Date(Date.now() + 86400000),
        sha256: image.sha256,
        pixelHash: image.pixelHash,
        perceptualHash: image.perceptualHash,
      });
      return {
        success: true as const,
        mediaId: id,
        image: productImage(null, "Prévia da imagem do produto", {
          id,
          origin: "upload",
          width: image.width,
          height: image.height,
        }),
      };
    });
    if (!result.success && stored) await removeMedia(stored);
    return result;
  } catch (error) {
    if (stored) await removeMedia(stored).catch(() => {});
    const code = error instanceof Error ? error.message : "";
    return {
      success: false as const,
      code:
        code === "BODY_TOO_LARGE"
          ? ("BODY_TOO_LARGE" as const)
          : code === "MEDIA_BUSY"
            ? ("MEDIA_BUSY" as const)
            : ("INVALID_IMAGE" as const),
    };
  }
}
