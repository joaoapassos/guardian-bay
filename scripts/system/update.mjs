import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Review each new migration before adding its exact SHA-256 here.
const reviewed = new Set([
  "a1d5ec46ecac145f3e7cce090647900f8769ac32053cecc755285a0d13295a4c",
]);

export async function readUpdateMigrations(directory) {
  const journal = JSON.parse(
    await readFile(join(directory, "drizzle/meta/_journal.json"), "utf8"),
  );
  if (
    journal.dialect !== "postgresql" ||
    !Array.isArray(journal.entries) ||
    !journal.entries.length
  )
    throw new Error("Journal de migrations inválido.");
  let previous = 0;
  return Promise.all(
    journal.entries.map(async (entry, index) => {
      if (
        entry.idx !== index ||
        !Number.isSafeInteger(entry.when) ||
        entry.when <= previous ||
        !new RegExp(`^${String(index).padStart(4, "0")}_[a-z0-9_]+$`).test(
          entry.tag,
        )
      )
        throw new Error("Journal de migrations inválido.");
      previous = entry.when;
      const sql = await readFile(
        join(directory, "drizzle", `${entry.tag}.sql`),
      );
      const hash = createHash("sha256").update(sql).digest("hex");
      return { when: entry.when, hash, reviewed: reviewed.has(hash) };
    }),
  );
}

export function checkMigrationHistory(migrations, history) {
  if (
    history.length > migrations.length ||
    history.some(
      (row, i) =>
        row.when !== migrations[i].when || row.hash !== migrations[i].hash,
    )
  )
    throw new Error(
      "Histórico de migrations diverge do checkout; restaure ou investigue antes de atualizar.",
    );
  const pending = migrations.slice(history.length);
  if (pending.some((migration) => !migration.reviewed))
    throw new Error(
      "Migration pendente sem revisão de segurança; atualização interrompida antes de alterar o banco.",
    );
  return pending.length;
}

export async function runUpdateSteps(steps) {
  let migrationStarted = false;
  try {
    await steps.prepare();
    migrationStarted = true;
    await steps.migrate();
    await steps.grants();
    await steps.build();
    await steps.activate();
  } catch (error) {
    throw new Error(
      migrationStarted
        ? `Atualização falhou após o início das migrations; rollback de código não desfaz alterações no banco. ${error.message}`
        : `Atualização falhou antes das migrations; banco não foi alterado. ${error.message}`,
    );
  }
}
