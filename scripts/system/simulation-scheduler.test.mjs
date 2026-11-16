import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSimulationScheduler,
  randomBatchSize,
} from "./simulation-scheduler.mjs";

test("distribui os quatro tipos e repete cada um a cada cinco minutos", () => {
  const scheduler = createSimulationScheduler(0);
  const seen = new Map();
  for (let time = 0; time <= 1_200_000; time += 1000) {
    const operation = scheduler.next(time);
    if (!operation) continue;
    const previous = seen.get(operation);
    if (previous !== undefined) assert.equal(time - previous, 300_000);
    else assert.ok(time < 300_000, `${operation}: ${time}`);
    seen.set(operation, time);
    scheduler.success(operation, time);
  }
  assert.deepEqual([...seen.keys()].sort(), [
    "category",
    "order",
    "product",
    "user",
  ]);
});

test("falhas não contam como sucesso e novas tentativas são limitadas", () => {
  const scheduler = createSimulationScheduler(0);
  const operation = scheduler.next(0);
  assert.equal(operation, "user");
  scheduler.failure(operation, 0);
  assert.notEqual(scheduler.next(1000), operation);
  assert.equal(scheduler.next(5000), operation);
  scheduler.failure(operation, 5000);
  assert.notEqual(scheduler.next(10_000), operation);
  assert.equal(scheduler.next(15_000), operation);
});

test("não escolhe uma operação antes do horário nem aceita tipo inválido", () => {
  const scheduler = createSimulationScheduler(0);
  assert.equal(scheduler.next(0), "user");
  scheduler.success("user", 0);
  assert.equal(scheduler.next(1000), null);
  assert.throws(() => scheduler.success("invalid", 1000));
});

test("sorteia de um a cinco registros e rejeita aleatoriedade inválida", () => {
  assert.equal(
    randomBatchSize(() => 0),
    1,
  );
  assert.equal(
    randomBatchSize(() => 0.999999),
    5,
  );
  assert.throws(() => randomBatchSize(() => 1));
});
