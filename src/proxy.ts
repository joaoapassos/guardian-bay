import { type NextRequest, NextResponse } from "next/server";
import { loginHref } from "@/features/auth/safe-return";
import { sessionCookiePolicy } from "@/features/auth/session-cookie-policy";

export function proxy(request: NextRequest) {
  // Navigation optimization only. Actions and all private reads still authorize
  // at their own server boundary; an opaque cookie never proves a live session.
  if (request.method !== "GET" && request.method !== "HEAD")
    return NextResponse.next();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-guardian-return-to",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  const cookie = request.cookies.get(sessionCookiePolicy().name)?.value;
  if (!cookie || !/^[0-9a-f]{64}$/.test(cookie)) {
    return NextResponse.redirect(
      new URL(
        loginHref(request.nextUrl.pathname + request.nextUrl.search),
        request.url,
      ),
    );
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Admin resolves authentication and its access-denied experience on the server.
export const config = {
  matcher: [
    "/account/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/admin/:path*",
  ],
};
