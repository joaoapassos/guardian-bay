import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { loginHref } from "./features/auth/safe-return";
import { proxy } from "./proxy";

describe("optimistic route checks", () => {
  it.each([
    "/account",
    "/cart",
    "/checkout",
    "/orders/private-reference",
  ])("redirects a visitor at %s with a validated return destination", (path) => {
    const response = proxy(
      new NextRequest(`https://guardian.test${path}?private=hidden`),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `https://guardian.test${loginHref(`${path}?private=hidden`)}`,
    );
  });
  it("overwrites the request return hint and preserves its actual query", () => {
    const response = proxy(
      new NextRequest("https://guardian.test/admin/catalog?page=3", {
        headers: {
          cookie: `guardian-session=${"a".repeat(64)}`,
          "x-guardian-return-to": "//evil.test",
        },
      }),
    );
    expect(
      response.headers.get("x-middleware-request-x-guardian-return-to"),
    ).toBe("/admin/catalog?page=3");
  });
  it("does not regard a malformed cookie as a session", () => {
    expect(
      proxy(
        new NextRequest("https://guardian.test/account", {
          headers: { cookie: "guardian-session=invalid" },
        }),
      ).status,
    ).toBe(307);
  });
  it("lets the server revalidate opaque cookies without claiming authentication", () => {
    const response = proxy(
      new NextRequest("https://guardian.test/account", {
        headers: { cookie: `guardian-session=${"a".repeat(64)}` },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it("leaves Actions to their own input/origin/authorization checks", () => {
    expect(
      proxy(
        new NextRequest("https://guardian.test/account", { method: "POST" }),
      ).headers.get("x-middleware-next"),
    ).toBe("1");
  });
  it("uses only the host-prefixed production cookie", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const request = new NextRequest("https://guardian.test/account", {
        headers: { cookie: `guardian-session=${"a".repeat(64)}` },
      });
      expect(proxy(request).status).toBe(307);
      const secure = new NextRequest("https://guardian.test/account", {
        headers: { cookie: `__Host-guardian-session=${"a".repeat(64)}` },
      });
      expect(proxy(secure).headers.get("x-middleware-next")).toBe("1");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
