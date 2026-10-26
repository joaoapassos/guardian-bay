import { uploadProductImage } from "@/features/catalog/server/upload-product-image";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const result = await uploadProductImage(request);
  return Response.json(result, {
    status: result.success
      ? 201
      : result.code === "FORBIDDEN"
        ? 403
        : result.code === "RATE_LIMITED" || result.code === "MEDIA_BUSY"
          ? 429
          : result.code === "BODY_TOO_LARGE"
            ? 413
            : 400,
    headers: { "Cache-Control": "private, no-store" },
  });
}
