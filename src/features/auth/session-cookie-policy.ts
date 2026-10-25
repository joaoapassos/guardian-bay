// Shared request policy only; this module must not import session storage or DB.
export function sessionCookiePolicy() {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: secure ? "__Host-guardian-session" : "guardian-session",
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}
