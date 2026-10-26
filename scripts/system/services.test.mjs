import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { renderProxy } from "./https-proxy.mjs";
import { renderService } from "./services.mjs";

test("production unit binds Next to loopback, runs without root and has no migrator credential", () => {
  const unit = renderService({
    installationId: "fixture",
    installDir: "/opt/guardian-bay",
    appPort: 3000,
  });
  assert.match(unit, /User=guardian-bay\n/);
  assert.match(unit, /--hostname 127.0.0.1 --port 3000/);
  assert.ok(!unit.includes("MIGRATION_DATABASE_URL"));
  assert.ok(!unit.includes("npm run dev"));
  assert.ok(!unit.includes("{{"));
  assert.match(unit, /ProtectSystem=strict/);
  const proxy = renderProxy({
    installationId: "fixture",
    host: "192.168.1.20",
    appPort: 3000,
  });
  assert.match(proxy, /https:\/\/192.168.1.20/);
  assert.match(proxy, /bind 192.168.1.20/);
  assert.match(proxy, /tls internal/);
  assert.match(proxy, /max_size 6MB/);
  assert.match(proxy, /header_up Host \{http.request.hostport\}/);
  assert.ok(!proxy.includes("{{"));
  assert.ok(!proxy.includes("guardianbay.com.br"));
  assert.ok(
    !renderProxy({
      installationId: "fixture",
      host: "localhost",
      appPort: 3000,
      shared: true,
    }).includes("bind "),
  );
});
test("installer has no test/seed/DNS command path", async () => {
  const source = (
    await Promise.all(
      [
        "system-init.mjs",
        "system/packages.mjs",
        "system/release.mjs",
        "system/services.mjs",
        "system/https-proxy.mjs",
      ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")),
    )
  ).join("\n");
  assert.ok(!source.includes("'test'"));
  assert.ok(!source.includes('"test"'));
  assert.ok(!source.includes("seeder-products.mjs"));
  assert.ok(!source.includes("/etc/hosts"));
  assert.ok(!source.includes("curl |"));
  assert.ok(!source.includes('drizzle-kit/bin.cjs", "push'));
});
