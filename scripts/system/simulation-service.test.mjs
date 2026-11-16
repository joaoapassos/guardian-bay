import assert from "node:assert/strict";
import { test } from "node:test";
import { renderSimulationService } from "./simulation-service.mjs";

test("unidade não inicia automaticamente, roda sem root e usa instalação atual", () => {
  const unit = renderSimulationService({
    installationId: "fixture",
    installDir: "/opt/guardian-bay",
    adminEmail: "admin@example.test",
  });
  assert.match(unit, /^# Guardian Bay managed fixture/m);
  assert.match(unit, /User=guardian-bay\n/);
  assert.match(unit, /SIMULATION_ADMIN_EMAIL=admin@example\.test/);
  assert.match(unit, /current\/scripts\/system\/simulation-worker\.mjs/);
  assert.match(unit, /Restart=on-failure/);
  assert.match(unit, /StartLimitBurst=/);
  assert.match(unit, /NoNewPrivileges=true/);
  assert.doesNotMatch(unit, /MIGRATION_DATABASE_URL/);
  assert.throws(() =>
    renderSimulationService({
      installationId: "x",
      installDir: "/opt/guardian-bay",
      adminEmail: "bad\nUser=root",
    }),
  );
});
