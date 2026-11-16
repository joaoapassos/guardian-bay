import assert from "node:assert/strict";
import { test } from "node:test";
import { createSimulationStore } from "./simulation-store.mjs";

test("rejeita intenções inválidas antes de consultar o banco", async () => {
  let touched = false;
  const db = {
    transaction: () => {
      touched = true;
    },
  };
  const store = createSimulationStore({
    db,
    adminEmail: "admin@example.test",
    maxPerType: 100,
  });
  await assert.rejects(
    store.create("unknown", "00000000-0000-4000-8000-000000000001"),
  );
  await assert.rejects(store.create("user", "not-an-id"));
  assert.equal(touched, false);
});

test("não aceita limite ausente, zero ou administrador sem e-mail válido", () => {
  const db = { transaction: () => {} };
  assert.throws(() =>
    createSimulationStore({
      db,
      adminEmail: "admin@example.test",
      maxPerType: 0,
    }),
  );
  assert.throws(() =>
    createSimulationStore({ db, adminEmail: "invalid", maxPerType: 100 }),
  );
});
