import assert from "node:assert/strict";

export function proxyProtocol(value = "h1") {
  assert.ok(["h1", "h2"].includes(value), "Invalid local proxy protocol");
  return value;
}

export function upstreamConnectionLimit(value = "unbounded") {
  assert.ok(
    ["unbounded", "16"].includes(value),
    "Invalid local upstream connection budget",
  );
  return value === "unbounded" ? Infinity : 16;
}

export function upstreamHeaders(input) {
  const headers = { ...input };
  const authority = headers[":authority"];
  if (authority && headers.host && authority !== headers.host) return null;
  headers.host ??= authority;
  if (headers.host !== "127.0.0.1:3449") return null;
  for (const name of Object.keys(headers))
    if (
      name.startsWith(":") ||
      name.startsWith("x-forwarded-") ||
      [
        "forwarded",
        "x-real-ip",
        "connection",
        "proxy-connection",
        "keep-alive",
        "upgrade",
        "transfer-encoding",
        "te",
      ].includes(name)
    )
      delete headers[name];
  return headers;
}

export function downstreamHeaders(input, http2) {
  if (!http2) return input;
  return Object.fromEntries(
    Object.entries(input).filter(
      ([name]) =>
        ![
          "connection",
          "proxy-connection",
          "keep-alive",
          "upgrade",
          "transfer-encoding",
        ].includes(name),
    ),
  );
}
