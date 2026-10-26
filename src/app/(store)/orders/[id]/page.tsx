import { redirect } from "next/navigation";
export default async function OrderAlias({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const query = new URLSearchParams();
  if (typeof page === "string") query.set("page", page);
  else if (Array.isArray(page))
    for (const value of page) query.append("page", value);
  redirect(
    `/account/orders/${encodeURIComponent(id)}${query.size ? `?${query}` : ""}`,
  );
}
