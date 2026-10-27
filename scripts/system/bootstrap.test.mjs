import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInstallationSecrets,
  runtimeEnvironment,
} from "./environment.mjs";
import {
  postgresHba,
  roleProvisioningSql,
  runtimeGrantsSql,
} from "./postgres.mjs";
import { parseInitOptions, supportedPlatform } from "./preflight.mjs";

test("only the verified Ubuntu LTS versions are eligible", () => {
  for (const version of ["24.04", "26.04"]) {
    const platform = {
      platform: "linux",
      arch: "x64",
      release: `ID=ubuntu\nVERSION_ID="${version}"\n`,
      node: "24.19.0",
      systemd: true,
    };
    assert.equal(supportedPlatform(platform), true, version);
    for (const patch of [
      { platform: "win32" },
      { arch: "arm64" },
      { node: "24.18.9" },
      { node: "22.99.0" },
      { systemd: false },
    ])
      assert.equal(supportedPlatform({ ...platform, ...patch }), false);
  }
  for (const release of [
    "ID=ubuntu\nVERSION_ID=22.04",
    "ID=ubuntu\nVERSION_ID=26.10",
    "ID=ubuntu\nVERSION_ID=26.04.1",
    "ID=debian\nVERSION_ID=26.04",
    "ID=linuxmint\nID_LIKE=ubuntu\nVERSION_ID=26.04",
    "ID=ubuntu\nVERSION_ID=26.04\nVERSION_ID=24.04",
  ])
    assert.equal(
      supportedPlatform({
        platform: "linux",
        arch: "x64",
        release,
        node: "24.19.0",
        systemd: true,
      }),
      false,
      release,
    );
});

test("bootstrap defaults and platform/argument checks are deterministic", () => {
  const options = parseInitOptions([]);
  assert.equal(options.dbPort, 5433);
  assert.equal(options.appPort, 3000);
  assert.equal(options.host, "localhost");
  assert.equal(
    supportedPlatform({
      platform: "linux",
      arch: "x64",
      release: 'ID=ubuntu\nVERSION_ID="24.04"',
      node: "24.19.0",
      systemd: true,
    }),
    true,
  );
  for (const patch of [
    { platform: "win32" },
    { arch: "arm64" },
    { node: "24.18.0" },
    { release: "ID=debian\nVERSION_ID=12" },
    { systemd: false },
  ])
    assert.equal(
      supportedPlatform({
        platform: "linux",
        arch: "x64",
        release: 'ID=ubuntu\nVERSION_ID="24.04"',
        node: "24.19.0",
        systemd: true,
        ...patch,
      }),
      false,
    );
  for (const args of [
    ["--domain", "guardianbay.com.br"],
    ["--host", "example.com"],
    ["--db-port", "5433;evil"],
    ["--install-dir", "/"],
    ["--app-port", "5433"],
  ])
    assert.throws(() => parseInitOptions(args));
});
test("credentials have independent strong secrets, valid CPF key and separate runtime authority", () => {
  const secrets = createInstallationSecrets();
  assert.ok(secrets.appPassword.length >= 32);
  assert.ok(secrets.migratorPassword.length >= 32);
  assert.notEqual(secrets.appPassword, secrets.migratorPassword);
  assert.equal(Buffer.from(secrets.cpfKey, "base64").length, 32);
  const env = runtimeEnvironment(parseInitOptions([]), secrets);
  assert.match(env.DATABASE_URL, /guardian_bay_app/);
  assert.ok(!JSON.stringify(env).includes(secrets.migratorPassword));
  assert.equal(env.PRODUCT_MEDIA_DIR, "/var/lib/guardian-bay/media");
});
test("PG bootstrap restricts roles, HBA and grants to own database", () => {
  const options = parseInitOptions([]),
    secrets = createInstallationSecrets();
  const sql = roleProvisioningSql(secrets);
  assert.match(sql, /NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION/);
  assert.ok(!sql.includes("GRANT ALL ON DATABASE"));
  const hba = postgresHba();
  assert.match(
    hba,
    /guardian_bay guardian_bay_app,guardian_bay_migrator 127\.0\.0\.1\/32 scram-sha-256/,
  );
  assert.match(
    hba,
    /all guardian_bay_app,guardian_bay_migrator 0\.0\.0\.0\/0 reject/,
  );
  assert.match(runtimeGrantsSql(), /GRANT SELECT, INSERT, UPDATE, DELETE/);
  assert.ok(!runtimeGrantsSql().includes("GRANT CREATE"));
  assert.equal(options.dbPort, 5433);
});
