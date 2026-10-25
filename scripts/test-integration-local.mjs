import { spawnSync } from "node:child_process";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Explicit .env.test.local only; never load the application's env or infer a URL.
const preflight = spawnSync(
  process.execPath,
  ["scripts/test-environment.mjs", "integration"],
  { stdio: "inherit", windowsHide: true },
);
if (preflight.status !== 0) process.exit(preflight.status ?? 1);
const sql = postgres(process.env.TEST_DATABASE_URL, {
  max: 1,
  onnotice: () => {},
});
try {
  const [target] = await sql`select current_database() as name`;
  if (target.name !== "guardian_bay_test")
    throw new Error("Invalid test database");
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  console.info("Migrations aplicadas somente ao banco dedicado de testes.");
} catch {
  console.error(
    "Falha ao preparar o banco dedicado de testes; credenciais e detalhes internos omitidos.",
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
if (!process.exitCode) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.integration.config.mts",
    ],
    { stdio: "inherit", windowsHide: true },
  );
  process.exitCode = result.status ?? 1;
}
