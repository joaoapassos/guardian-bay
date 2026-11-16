import assert from "node:assert/strict";
import { test } from "node:test";
import { runSimulation } from "./simulation-loop.mjs";

test("termina operação em andamento antes de parar e não inicia outra", async () => {
  const controller = new AbortController();
  const calls = [];
  const events = [];
  const scheduler = {
    next: () => "user",
    success: (...args) => calls.push(["success", ...args]),
    failure: () => assert.fail("falha inesperada"),
  };
  await runSimulation({
    scheduler,
    clock: () => 0,
    random: () => 0,
    signal: controller.signal,
    perform: async (operation) => {
      calls.push(["perform", operation]);
      controller.abort();
      return "registro-1";
    },
    wait: async () => assert.fail("não deveria esperar"),
    log: (event) => events.push(event),
  });
  assert.deepEqual(calls, [
    ["perform", "user"],
    ["success", "user", 0],
  ]);
  assert.deepEqual(events, [
    { operation: "user", outcome: "success", id: "registro-1" },
  ]);
});

test("falha mantém quantidade pendente e não conta sucesso antes do commit", async () => {
  const controller = new AbortController();
  let attempts = 0;
  const outcomes = [];
  const scheduler = {
    next: () => "order",
    success: () => outcomes.push("success"),
    failure: () => outcomes.push("failure"),
  };
  await runSimulation({
    scheduler,
    clock: () => 0,
    random: () => 0.2,
    signal: controller.signal,
    perform: async () => {
      attempts++;
      if (attempts === 1) throw new Error("secret");
      if (attempts === 3) controller.abort();
      return `id-${attempts}`;
    },
    wait: async () => {},
    log: (event) => outcomes.push(event.outcome),
  });
  assert.equal(attempts, 3);
  assert.deepEqual(outcomes, [
    "failure",
    "failure",
    "success",
    "success",
    "success",
  ]);
});

test("reutiliza a mesma intenção após falha para permitir repetição idempotente", async () => {
  const controller = new AbortController();
  const keys = [];
  let counter = 0;
  await runSimulation({
    scheduler: { next: () => "user", success: () => {}, failure: () => {} },
    clock: () => 0,
    random: () => 0,
    makeId: () => `intent-${++counter}`,
    signal: controller.signal,
    perform: async (_operation, id) => {
      keys.push(id);
      if (keys.length === 1) throw new Error("timeout");
      controller.abort();
      return "record";
    },
    wait: async () => {},
    log: () => {},
  });
  assert.deepEqual(keys, ["intent-1", "intent-1"]);
});

test("recupera intenção persistida antes de criar um novo registro", async () => {
  const controller = new AbortController();
  const saved = [];
  const state = {
    load: async () => ({ user: { remaining: 1, id: "intenção-anterior" } }),
    save: async (value) => saved.push(structuredClone(value)),
  };
  await runSimulation({
    scheduler: { next: () => "user", success: () => {}, failure: () => {} },
    clock: () => 0,
    random: () => 0,
    signal: controller.signal,
    state,
    perform: async (_operation, id) => {
      controller.abort();
      assert.equal(id, "intenção-anterior");
      return "record";
    },
    wait: async () => {},
    log: () => {},
  });
  assert.deepEqual(saved, [{}]);
});
