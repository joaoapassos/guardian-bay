import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { reserveAbuseBudget } from "./server";

vi.mock("server-only", () => ({}));
const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error("TEST_DATABASE_URL é obrigatória.");
const url = new URL(value);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
  url.pathname !== "/guardian_bay_test" ||
  (process.env.DATABASE_URL &&
    new URL(process.env.DATABASE_URL).pathname === url.pathname)
)
  throw new Error("Banco local dedicado obrigatório.");
const client = postgres(value, { max: 1, onnotice: () => {} });
const userId = randomUUID();
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", value);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
});
afterAll(async () => {
  await client`DELETE FROM abuse_budgets WHERE user_id=${userId}`;
  await client.end();
  await getDb().$client.end();
  vi.unstubAllEnvs();
});
it("ECMSG-111: 20 reservas concorrentes admitem exatamente cinco; janela reinicia", async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      getDb().transaction((tx) => reserveAbuseBudget(tx, userId, "checkout")),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(5);
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='checkout'`
    )[0].attempts,
  ).toBe(5);
  await client`UPDATE abuse_budgets SET started_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE user_id=${userId}`;
  expect(
    await getDb().transaction((tx) =>
      reserveAbuseBudget(tx, userId, "checkout"),
    ),
  ).toBe(true);
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='checkout'`
    )[0].attempts,
  ).toBe(1);
  expect(
    await getDb().transaction((tx) =>
      reserveAbuseBudget(tx, userId, "admin.catalog"),
    ),
  ).toBe(true);
});
it("ECMSG-111: PK, limites e operação fechada no DB", async () => {
  await expect(
    client`UPDATE abuse_budgets SET attempts=6 WHERE user_id=${userId} AND operation='checkout'`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE abuse_budgets SET operation='client.free' WHERE user_id=${userId}`,
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client`UPDATE abuse_budgets SET expires_at=started_at WHERE user_id=${userId}`,
  ).rejects.toMatchObject({ code: "23514" });
});

it("ECMSG-115: budget administrativo é isolado e limitado sob concorrência", async () => {
  const results = await Promise.all(
    Array.from({ length: 45 }, () =>
      getDb().transaction((tx) =>
        reserveAbuseBudget(tx, userId, "admin.inventory"),
      ),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(30);
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='admin.inventory'`
    )[0].attempts,
  ).toBe(30);
  expect(
    (
      await client`SELECT attempts FROM abuse_budgets WHERE user_id=${userId} AND operation='checkout'`
    )[0].attempts,
  ).toBe(1);
});

it("ECMSG-116: limpeza operacional remove só bucket expirado da fixture", async () => {
  await client`UPDATE abuse_budgets SET started_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 minute' WHERE user_id=${userId} AND operation='admin.inventory'`;
  await client`DELETE FROM abuse_budgets WHERE (user_id,operation) IN (SELECT user_id,operation FROM abuse_budgets WHERE user_id=${userId} AND expires_at<=CURRENT_TIMESTAMP ORDER BY expires_at,user_id,operation LIMIT 1000)`;
  expect(
    (
      await client`SELECT operation FROM abuse_budgets WHERE user_id=${userId} ORDER BY operation`
    ).map((row) => row.operation),
  ).toEqual(["admin.catalog", "checkout"]);
});
