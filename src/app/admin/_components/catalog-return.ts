// Navigation context only, never an authority or an arbitrary redirect URL.
export function catalogReturn(input: unknown) {
  if (typeof input !== "string" || input.length > 1200) return "/admin/catalog";
  if (input !== "/admin/catalog" && !input.startsWith("/admin/catalog?"))
    return "/admin/catalog";
  const url = new URL(input, "https://guardian.invalid");
  if (
    url.origin !== "https://guardian.invalid" ||
    url.pathname !== "/admin/catalog"
  )
    return "/admin/catalog";
  const allowed = new Set(["query", "category", "publication", "page"]);
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key)))
    return "/admin/catalog";
  return url.pathname + url.search;
}
