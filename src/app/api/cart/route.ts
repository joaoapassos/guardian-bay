import { readCart } from "@/features/cart/server/read-cart";

// This is a browser HTTP read for the on-demand drawer, never an RSC proxy.
export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    const result = await readCart();
    return Response.json(result, {
      status: result.success ? 200 : 401,
      headers,
    });
  } catch {
    return Response.json(
      { success: false, code: "UNAVAILABLE" },
      { status: 503, headers },
    );
  }
}
