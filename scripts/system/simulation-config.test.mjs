import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSimulationConfig } from "./simulation-config.mjs";

test("aceita somente configuração explícita de demonstração no banco local instalado", () => {
  const env = {
    DATABASE_URL:
      "postgresql://guardian_bay_app:fixture@127.0.0.1:5433/guardian_bay",
    GUARDIAN_LOCAL_DEMO: "1",
    SIMULATION_ADMIN_EMAIL: "admin@example.test",
  };
  assert.equal(parseSimulationConfig(env).maxPerType, 10000);
  for (const change of [
    { GUARDIAN_LOCAL_DEMO: "0" },
    { DATABASE_URL: "postgresql://app:fixture@example.test/guardian_bay" },
    { DATABASE_URL: "postgresql://app:fixture@localhost/guardian_bay_test" },
    { SIMULATION_MAX_PER_TYPE: "0" },
  ]) {
    assert.throws(() => parseSimulationConfig({ ...env, ...change }));
  }
});
