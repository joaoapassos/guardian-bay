import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Immutable supported upgrade base. Requires full checkout history, not a remote.
const base = "46be877d1798d8d06a9cfd1204192483842141d3";
const root = resolve(".");
const temporary = mkdtempSync(join(tmpdir(), "guardian-migrations-"));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
function run(args) {
  const result = spawnSync(
    process.execPath,
    [join(root, args[0]), ...args.slice(1)],
    { encoding: "utf8", cwd: temporary },
  );
  assert.equal(result.status, 0, "Drizzle validation failed");
}
function fromBase(path) {
  const result = spawnSync("git", ["show", `${base}:${path}`], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "Supported base history must be available");
  return result.stdout;
}
function tree(path) {
  return Object.fromEntries(
    readdirSync(path, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const full = join(entry.parentPath, entry.name);
        return [full.slice(path.length), readFileSync(full, "utf8")];
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
let stage = "journal";
let control;
const created = [];
try {
  const journal = readJson("drizzle/meta/_journal.json");
  assert.equal(journal.dialect, "postgresql");
  assert.ok(journal.entries.length > 0);
  let previous = "00000000-0000-0000-0000-000000000000";
  let timestamp = 0;
  for (const [index, entry] of journal.entries.entries()) {
    assert.equal(entry.idx, index);
    assert.match(entry.tag, new RegExp(`^${String(index).padStart(4, "0")}_`));
    assert.ok(entry.when > timestamp);
    timestamp = entry.when;
    const snapshot = readJson(
      `drizzle/meta/${String(index).padStart(4, "0")}_snapshot.json`,
    );
    assert.equal(snapshot.prevId, previous);
    assert.equal(snapshot.dialect, "postgresql");
    previous = snapshot.id;
    assert.ok(readFileSync(`drizzle/${entry.tag}.sql`, "utf8").trim());
  }
  assert.equal(
    readdirSync("drizzle").filter((file) => file.endsWith(".sql")).length,
    journal.entries.length,
    "Every migration belongs to the journal",
  );
  assert.equal(
    readdirSync("drizzle/meta").filter((file) =>
      file.endsWith("_snapshot.json"),
    ).length,
    journal.entries.length,
  );
  stage = "drizzle-copy";
  const copy = join(temporary, "drizzle");
  cpSync("drizzle", copy, { recursive: true });
  const config = join(temporary, "drizzle.config.mjs");
  writeFileSync(
    config,
    `export default ${JSON.stringify({ dialect: "postgresql", schema: join(root, "src/db/schema/**/*.ts").replaceAll("\\", "/"), out: "./drizzle" })};\n`,
  );
  stage = "drizzle-check";
  run(["node_modules/drizzle-kit/bin.cjs", "check", `--config=${config}`]);
  stage = "drift";
  const before = tree(copy);
  run(["node_modules/drizzle-kit/bin.cjs", "generate", `--config=${config}`]);
  assert.deepEqual(tree(copy), before, "Schema/snapshot drift detected");

  // Only explicit loopback guardian_bay_test credentials may create validation DBs.
  stage = "test-environment";
  const url = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  assert.equal(url.pathname, "/guardian_bay_test");
  if (process.env.DATABASE_URL)
    assert.notEqual(new URL(process.env.DATABASE_URL).pathname, url.pathname);
  control = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const [version] =
    await control`select current_setting('server_version_num') as version`;
  assert.equal(Math.trunc(Number(version.version) / 10000), 18);
  stage = "base-history";
  const old = join(temporary, "base");
  mkdirSync(join(old, "meta"), { recursive: true });
  const oldJournalText = fromBase("drizzle/meta/_journal.json");
  const oldJournal = JSON.parse(oldJournalText);
  assert.deepEqual(
    journal.entries.slice(0, oldJournal.entries.length),
    oldJournal.entries,
  );
  writeFileSync(join(old, "meta/_journal.json"), oldJournalText);
  for (const entry of oldJournal.entries) {
    const sql = fromBase(`drizzle/${entry.tag}.sql`);
    assert.equal(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"), sql);
    writeFileSync(join(old, `${entry.tag}.sql`), sql);
  }
  const structure = async (db) => ({
    columns:
      await db`select table_name,column_name,data_type,column_default,is_nullable from information_schema.columns where table_schema='public' order by table_name,ordinal_position`,
    constraints:
      await db`select c.conname,pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by c.conname`,
    indexes:
      await db`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`,
  });
  stage = "zero-upgrade";
  const structures = [];
  for (const mode of ["zero", "upgrade"]) {
    const name = `guardian_sdlc_${randomUUID().replaceAll("-", "")}`;
    // Identifier contains only server-generated hex and a fixed prefix.
    assert.match(name, /^guardian_sdlc_[a-f0-9]{32}$/);
    await control.unsafe(`CREATE DATABASE ${name}`);
    created.push(name);
    const connection = new URL(url);
    connection.pathname = `/${name}`;
    const db = postgres(connection.toString(), { max: 1, onnotice: () => {} });
    try {
      let product;
      if (mode === "upgrade") {
        await migrate(drizzle(db), { migrationsFolder: old });
        const [category] =
          await db`insert into categories(name) values ('SDLC upgrade fixture') returning id`;
        [product] =
          await db`insert into products(name,category_id,amount) values ('SDLC upgrade product',${category.id},199) returning id`;
        await db`insert into inventory(product_id,available_quantity) values (${product.id},7)`;
      }
      await migrate(drizzle(db), { migrationsFolder: "drizzle" });
      if (product) {
        const [stock] =
          await db`select available_quantity,revision from inventory where product_id=${product.id}`;
        assert.equal(stock.available_quantity, 7);
        assert.equal(stock.revision, 1);
      }
      structures.push(await structure(db));
    } finally {
      await db.end();
    }
  }
  assert.deepEqual(
    structures[0],
    structures[1],
    "Zero/upgrade physical schema mismatch",
  );
  console.info(
    "PostgreSQL 18: zero/upgrade, data preservation, journal/snapshots and isolated drift validation passed.",
  );
} catch {
  console.error(`Migration/schema failed at controlled stage: ${stage}`);
  console.error(
    "Migration/schema gate failed. Check journal, snapshots, declared schema and PostgreSQL 18 test-only prerequisites; no credentials are printed.",
  );
  process.exitCode = 1;
} finally {
  if (control) {
    for (const name of created) await control.unsafe(`DROP DATABASE ${name}`);
    await control.end();
  }
  rmSync(temporary, { recursive: true, force: true });
}
