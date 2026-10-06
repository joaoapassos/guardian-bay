import "server-only";
import { headers } from "next/headers";

// Next rejects mismatched Origins; also reject missing/opaque Origins here.
// Trusted reverse proxies must preserve the public Host and HTTPS Origin.
// X-Forwarded-Host is deliberately not an authority at this boundary.
export async function requireSameOrigin() {
  const requestHeaders = await headers();
  try {
    const origin = new URL(requestHeaders.get("origin") ?? "");
    if (
      origin.origin !== requestHeaders.get("origin") ||
      origin.host !== requestHeaders.get("host") ||
      !["http:", "https:"].includes(origin.protocol) ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    )
      throw new Error();
  } catch {
    throw new Error("Requisição inválida.");
  }
}
