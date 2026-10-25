export function safeReturn(input: unknown) {
  if (
    typeof input !== "string" ||
    input.length > 1600 ||
    /[\\\r\n]/.test(input)
  )
    return "/account";
  if (
    !/^\/(?:products(?:\/[a-f0-9-]{36})?|cart|checkout|account(?:\/addresses)?|orders(?:\/[a-f0-9-]{36})?)(?:\?[^#]*)?$/.test(
      input,
    )
  )
    return "/account";
  const url = new URL(input, "https://guardian.invalid");
  return url.origin === "https://guardian.invalid"
    ? url.pathname + url.search
    : "/account";
}
