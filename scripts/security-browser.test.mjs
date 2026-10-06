import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

test("production HTTP headers and scaffold resources", async () => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3107",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const closed = once(server, "close");
  let ready = false;
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Ready in")) ready = true;
  });
  // Drain stderr without printing potentially sensitive runtime details.
  server.stderr.on("data", () => {});
  try {
    for (let i = 0; i < 100 && !ready && server.exitCode === null; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(ready, true, "owned production server must start");
    const base = "http://127.0.0.1:3107";
    for (const path of ["/", "/missing-security-resource", "/next.svg"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, path.includes("missing") ? 404 : 200);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.equal(
        response.headers.get("referrer-policy"),
        "strict-origin-when-cross-origin",
      );
      assert.match(response.headers.get("permissions-policy"), /camera=\(\)/);
      assert.equal(response.headers.get("x-powered-by"), null);
      assert.equal(response.headers.get("strict-transport-security"), null);
      const csp = response.headers.get("content-security-policy");
      for (const directive of [
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self'",
        "font-src 'self'",
        "media-src 'none'",
        "frame-src 'none'",
        "worker-src 'none'",
        "manifest-src 'self'",
      ])
        assert.ok(csp.includes(directive), directive);
      assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*|data:|blob:/);
      if (path !== "/") continue;
      const html = await response.text();
      assert.match(html, /self\.__next_f/);
      const resources = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
        .map((match) => match[1].replaceAll("&amp;", "&"))
        .filter(
          (resource) =>
            resource.startsWith("/_next/static/") || resource.endsWith(".svg"),
        );
      assert.ok(resources.some((resource) => resource.endsWith(".js")));
      assert.ok(resources.some((resource) => resource.endsWith(".css")));
      assert.ok(resources.some((resource) => resource.endsWith(".woff2")));
      for (const resource of new Set(resources))
        assert.equal((await fetch(base + resource)).status, 200, resource);
    }
  } finally {
    server.kill();
    await closed;
  }
});
