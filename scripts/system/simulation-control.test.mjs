import assert from "node:assert/strict";
import { test } from "node:test";
import {
  changeSimulationState,
  formatUptime,
  parseSimulationCommand,
} from "./simulation-control.mjs";

test("interpreta apenas comandos conhecidos", () => {
  assert.equal(parseSimulationCommand([]), "toggle");
  for (const command of ["start", "stop", "status"])
    assert.equal(parseSimulationCommand([`--${command}`]), command);
  assert.throws(() => parseSimulationCommand(["--start", "--stop"]));
  assert.throws(() => parseSimulationCommand(["--other"]));
});

test("calcula tempo ativo a partir do relógio monotônico do sistema", () => {
  assert.equal(formatUptime(100_000_000, 3661), "0h 59min 21s");
  assert.equal(formatUptime(0, 100), "indisponível");
});

test("não cria duplicata nem interrompe ao recusar confirmação", async () => {
  const calls = [];
  const service = {
    active: async () => true,
    start: async () => calls.push("start"),
    stop: async () => calls.push("stop"),
  };
  assert.equal(await changeSimulationState("start", service), "active");
  assert.equal(
    await changeSimulationState("toggle", service, async () => false),
    "active",
  );
  assert.deepEqual(calls, []);
  assert.equal(
    await changeSimulationState("toggle", service, async () => true),
    "inactive",
  );
  assert.deepEqual(calls, ["stop"]);
});

test("inicia somente quando necessário e permite parada sem confirmação", async () => {
  const calls = [];
  let active = false;
  const service = {
    active: async () => active,
    start: async () => {
      calls.push("start");
      active = true;
    },
    stop: async () => {
      calls.push("stop");
      active = false;
    },
  };
  assert.equal(
    await changeSimulationState("toggle", service, async () => true),
    "active",
  );
  assert.equal(await changeSimulationState("stop", service), "inactive");
  assert.equal(await changeSimulationState("stop", service), "inactive");
  assert.deepEqual(calls, ["start", "stop", "stop"]);
});
