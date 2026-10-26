// A destination is navigation intent only. Every private operation still authorizes.
export function safeReturn(input: unknown) {
  if (
    typeof input !== "string" ||
    input.length > 1600 ||
    !input.startsWith("/") ||
    input.startsWith("//") ||
    hasUnsafeCharacters(input) ||
    input.includes("#")
  )
    return "/account";
  try {
    const url = new URL(input, "https://guardian.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      url.origin !== "https://guardian.invalid" ||
      hasUnsafeCharacters(decodedPath) ||
      decodedPath.startsWith("//")
    )
      return "/account";
    if (
      !/^\/(?:products(?:\/[a-f0-9-]{36})?|cart|checkout|account(?:\/(?:addresses|payment-methods|orders(?:\/[a-f0-9-]{36})?))?|orders(?:\/[a-f0-9-]{36})?|admin(?:\/[a-zA-Z0-9_-]+)*|)$/.test(
        url.pathname,
      )
    )
      return "/account";
    return url.pathname + url.search;
  } catch {
    return "/account";
  }
}
function hasUnsafeCharacters(input: string) {
  return [...input].some(
    (character) =>
      character === "\\" ||
      character.charCodeAt(0) <= 32 ||
      character.charCodeAt(0) === 127,
  );
}
export function loginHref(returnTo: unknown) {
  return `/login?returnTo=${encodeURIComponent(safeReturn(returnTo))}`;
}
