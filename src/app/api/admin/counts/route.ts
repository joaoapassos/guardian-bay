import { countAdminRecords } from "@/features/admin/server/count-records";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  try {
    const result = await countAdminRecords([
      "products",
      "categories",
      "orders",
      "users",
    ]);
    if (!result.success)
      return Response.json(
        { code: result.code },
        { status: result.code === "UNAUTHENTICATED" ? 401 : 403, headers },
      );
    return Response.json(result.totals, { headers });
  } catch {
    return Response.json({ code: "UNAVAILABLE" }, { status: 503, headers });
  }
}
