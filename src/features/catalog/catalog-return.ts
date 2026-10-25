export function catalogReturn(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 1600 ||
    !/^\/products(?:\?|$)/.test(value)
  )
    return "/products";
  const url = new URL(value, "https://guardian.invalid");
  if (url.pathname !== "/products" || url.origin !== "https://guardian.invalid")
    return "/products";
  return url.pathname + url.search;
}
