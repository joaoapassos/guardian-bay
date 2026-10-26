import { existsSync } from "node:fs";
import { chmod, chown, readFile, writeFile } from "node:fs/promises";
import { portInUse } from "./preflight.mjs";
import { run } from "./runner.mjs";
import { saveInstallation } from "./state.mjs";

const app = "guardian_bay_app",
  migrator = "guardian_bay_migrator";
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
export function roleProvisioningSql(secrets) {
  return `DO $guardian$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${app}') THEN CREATE ROLE ${app} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${literal(secrets.appPassword)}; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${migrator}') THEN CREATE ROLE ${migrator} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD ${literal(secrets.migratorPassword)}; END IF;
END $guardian$;`;
}
export function postgresHba() {
  return `# Guardian Bay dedicated cluster; credentials cannot connect to another database.
local all postgres peer
local guardian_bay ${app},${migrator} scram-sha-256
local all ${app},${migrator} reject
host guardian_bay ${app},${migrator} 127.0.0.1/32 scram-sha-256
host all ${app},${migrator} 0.0.0.0/0 reject
host all ${app},${migrator} ::/0 reject
local all all peer
host all all 127.0.0.1/32 scram-sha-256
host all all ::1/128 scram-sha-256
`;
}
export function schemaProvisioningSql() {
  return `REVOKE ALL ON DATABASE guardian_bay FROM PUBLIC;
GRANT CONNECT ON DATABASE guardian_bay TO ${app},${migrator};
GRANT CREATE ON DATABASE guardian_bay TO ${migrator};
ALTER SCHEMA public OWNER TO ${migrator};
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ${app};
REVOKE CREATE ON SCHEMA public FROM ${app};
ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public REVOKE ALL ON TABLES FROM ${app};
`;
}
export function runtimeGrantsSql() {
  return `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${app};
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions,login_rate_limits,cart_items,cart_intents,addresses,saved_test_cards,saved_payment_methods,product_media TO ${app};
GRANT SELECT, INSERT, UPDATE ON categories,products,inventory,abuse_budgets,orders,order_payments TO ${app};
GRANT SELECT, INSERT ON users TO ${app};
GRANT UPDATE(name,cpf_encrypted,cpf_last2,password_hash) ON users TO ${app};
GRANT SELECT, INSERT ON audit_events,order_items TO ${app};
`;
}
export async function psql(
  options,
  input,
  { database = "postgres", sensitive = false } = {},
) {
  return run(
    "runuser",
    [
      "-u",
      "postgres",
      "--",
      "/usr/lib/postgresql/18/bin/psql",
      "-X",
      "-A",
      "-t",
      "-v",
      "ON_ERROR_STOP=1",
      "-p",
      String(options.dbPort),
      "-d",
      database,
    ],
    { input, capture: true, sensitive },
  );
}
export async function preparePostgres(options, state, secrets) {
  const base = "/etc/postgresql/18/guardian-bay";
  const marker = `${base}/conf.d/guardian-bay.conf`;
  if (!existsSync(`${base}/postgresql.conf`)) {
    if (await portInUse(options.dbPort))
      throw new Error(
        "Porta do PostgreSQL ocupada; não será reconfigurado outro serviço.",
      );
    state.clusterCreating = true;
    await saveInstallation(state);
    await run("pg_createcluster", [
      "18",
      "guardian-bay",
      "--port",
      String(options.dbPort),
      "--start-conf=auto",
      "--",
      "--auth-local=peer",
      "--auth-host=scram-sha-256",
    ]);
  } else if (existsSync(marker)) {
    if (
      !(await readFile(marker, "utf8")).includes(
        `# installation ${state.installationId}\n`,
      )
    )
      throw new Error("Cluster guardian-bay pertence a outra instalação.");
  } else if (!state.clusterCreating)
    throw new Error(
      "Cluster preexistente sem identificação; nenhuma alteração será feita.",
    );
  await writeFile(
    marker,
    `# installation ${state.installationId}\nlisten_addresses = '127.0.0.1'\nport = ${options.dbPort}\npassword_encryption = 'scram-sha-256'\n`,
    { mode: 0o644 },
  );
  const postgresId = (
    await run("id", ["-u", "postgres"], { capture: true })
  ).output.trim();
  const postgresGroup = (
    await run("id", ["-g", "postgres"], { capture: true })
  ).output.trim();
  await writeFile(`${base}/pg_hba.conf`, postgresHba(), { mode: 0o640 });
  await chmod(`${base}/pg_hba.conf`, 0o640);
  await chown(`${base}/pg_hba.conf`, Number(postgresId), Number(postgresGroup));
  await run("systemctl", ["enable", `postgresql@18-guardian-bay.service`]);
  const status = await run("pg_ctlcluster", ["18", "guardian-bay", "status"], {
    capture: true,
    allowFailure: true,
  });
  await run("pg_ctlcluster", [
    "18",
    "guardian-bay",
    status.code === 0 ? "restart" : "start",
  ]);
  const version = (
    await psql(options, "SELECT current_setting('server_version_num');")
  ).output.trim();
  if (Math.trunc(Number(version) / 10000) !== 18)
    throw new Error("Cluster ativo não corresponde ao PostgreSQL18 dedicado.");
  const systemId = (
    await psql(options, "SELECT system_identifier FROM pg_control_system();")
  ).output.trim();
  if (state.pgSystemId && state.pgSystemId !== systemId)
    throw new Error(
      "Identidade do cluster mudou; restaure/verifique a instalação antes de seguir.",
    );
  state.pgSystemId = systemId;
  state.clusterCreating = false;
  await saveInstallation(state);
  await psql(options, roleProvisioningSql(secrets), { sensitive: true });
  const roles = (
    await psql(
      options,
      `SELECT count(*) FROM pg_roles WHERE rolname IN ('${app}','${migrator}') AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls;`,
    )
  ).output.trim();
  const memberships = (
    await psql(
      options,
      `SELECT count(*) FROM pg_auth_members WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('${app}','${migrator}'));`,
    )
  ).output.trim();
  if (roles !== "2" || memberships !== "0")
    throw new Error(
      "Papéis existentes têm permissões inesperadas; não serão promovidos ou reutilizados.",
    );
  if (
    (
      await psql(
        options,
        "SELECT count(*) FROM pg_database WHERE datname='guardian_bay';",
      )
    ).output.trim() === "0"
  )
    await run("runuser", [
      "-u",
      "postgres",
      "--",
      "/usr/lib/postgresql/18/bin/createdb",
      "-p",
      String(options.dbPort),
      "--owner=postgres",
      "guardian_bay",
    ]);
  await psql(options, schemaProvisioningSql(), { database: "guardian_bay" });
}
export async function verifyDatabaseRoles(options, secrets) {
  for (const [role, password] of [
    [app, secrets.appPassword],
    [migrator, secrets.migratorPassword],
  ]) {
    const args = [
      "-X",
      "-A",
      "-t",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      "127.0.0.1",
      "-p",
      String(options.dbPort),
      "-U",
      role,
    ];
    await run(
      "/usr/lib/postgresql/18/bin/psql",
      [...args, "-d", "guardian_bay"],
      { input: "SELECT 1;", env: { PGPASSWORD: password }, sensitive: true },
    );
    const denied = await run(
      "/usr/lib/postgresql/18/bin/psql",
      [...args, "-d", "postgres"],
      {
        input: "SELECT 1;",
        env: { PGPASSWORD: password },
        sensitive: true,
        allowFailure: true,
      },
    );
    if (denied.code === 0)
      throw new Error(
        "Role consegue acessar outro banco; implantação bloqueada.",
      );
  }
  const permissions = (
    await psql(
      options,
      `SELECT has_schema_privilege('${app}','public','CREATE') OR has_database_privilege('${app}','guardian_bay','CREATE');`,
      { database: "guardian_bay" },
    )
  ).output.trim();
  if (permissions !== "f")
    throw new Error("Runtime possui DDL; implantação bloqueada.");
}
