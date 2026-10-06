import "server-only";
import { cookies } from "next/headers";
import { resolveSession } from "./session";

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

export async function getAuthenticatedIdentity() {
  const store = await cookies();
  return resolveSession(store.get(sessionCookiePolicy().name)?.value);
}
