import { readProductImage } from "@/features/catalog/server/read-product-image";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const image = await readProductImage((await params).id);
    if (!image)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": image.public
          ? "public, max-age=300"
          : "private, no-store",
        Vary: "Cookie",
      },
    });
  } catch {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
