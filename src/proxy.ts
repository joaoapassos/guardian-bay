import { type NextRequest, NextResponse } from "next/server";
import { sessionCookiePolicy } from "@/features/auth/session-cookie-policy";

export function proxy(request: NextRequest) {
  // Navigation optimization only. Actions and all private reads still authorize
  // at their own server boundary; an opaque cookie never proves a live session.
  if (request.method !== "GET" && request.method !== "HEAD")
    return NextResponse.next();
  const cookie = request.cookies.get(sessionCookiePolicy().name)?.value;
  if (!cookie || !/^[0-9a-f]{64}$/.test(cookie)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// Admin deliberately keeps its existing non-disclosing 404 guard.
export const config = {
  matcher: [
    "/account/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
  ],
};
