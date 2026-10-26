import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import {
  chmod,
  chown,
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  rename,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { run } from "./runner.mjs";

async function ensureAccount(name, home) {
  let account = await run("getent", ["passwd", name], {
    capture: true,
    allowFailure: true,
  });
  if (account.code !== 0) {
    await run("useradd", [
      "--system",
      "--user-group",
      "--home-dir",
      home,
      "--no-create-home",
      "--shell",
      "/usr/sbin/nologin",
      name,
    ]);
    account = await run("getent", ["passwd", name], { capture: true });
  }
  const fields = account.output.trim().split(":");
  const uid = Number(fields[2]),
    gid = Number(fields[3]);
  if (
    fields[0] !== name ||
    uid <= 0 ||
    uid >= 1000 ||
    fields[5] !== home ||
    fields[6] !== "/usr/sbin/nologin"
  )
    throw new Error(
      "Conta de serviço preexistente não corresponde à configuração esperada.",
    );
  return { uid, gid };
}
export async function serviceIdentity() {
  await mkdir("/var/cache/guardian-bay", { recursive: true, mode: 0o755 });
  await chmod("/var/cache/guardian-bay", 0o755);
  const app = await ensureAccount("guardian-bay", "/var/lib/guardian-bay");
  const builder = await ensureAccount(
    "guardian-bay-build",
    "/var/cache/guardian-bay/build",
  );
  const migrator = await ensureAccount("guardian-bay-migrate", "/nonexistent");
  for (const path of [
    "/var/lib/guardian-bay",
    "/var/lib/guardian-bay/media",
    "/var/lib/guardian-bay/seeds",
  ]) {
    await mkdir(path, { recursive: true, mode: 0o700 });
    await chmod(path, 0o700);
    await chown(path, app.uid, app.gid);
  }
  for (const path of [
    "/var/cache/guardian-bay/build",
    "/var/cache/guardian-bay/npm",
  ]) {
    await mkdir(path, { recursive: true, mode: 0o700 });
    await chmod(path, 0o700);
    await chown(path, builder.uid, builder.gid);
  }
  return { ...app, builder, migrator };
}
export async function sealRelease(release, identity) {
  await run("chown", ["-R", `0:${identity.gid}`, release.directory]);
  await run("chmod", ["-R", "a+rX,go-w", release.directory]);
}
export async function prepareRelease(options, identity) {
  const base = options.installDir;
  if (existsSync(base) && (await lstat(base)).isSymbolicLink())
    throw new Error("Diretório de instalação não pode ser symlink.");
  for (const directory of [
    base,
    join(base, "releases"),
    join(base, "tools"),
    join(base, "tools/bin"),
  ]) {
    await mkdir(directory, { recursive: true, mode: 0o755 });
    await chmod(directory, 0o755);
  }
  const nodePath = join(base, "tools/bin/node");
  await copyFile(process.execPath, `${nodePath}.next`);
  await chmod(`${nodePath}.next`, 0o755);
  await rename(`${nodePath}.next`, nodePath);
  const npmRoot = dirname(dirname(options.npmCli));
  const npm = JSON.parse(await readFile(join(npmRoot, "package.json"), "utf8"));
  if (npm.name !== "npm" || !/^\d+\.\d+\.\d+(?:[-\w.]*)$/.test(npm.version))
    throw new Error("Origem npm inválida.");
  const privateNpm = join(base, `tools/npm-${npm.version}`);
  if (!existsSync(privateNpm)) {
    await cp(npmRoot, privateNpm, { recursive: true });
    await run("chmod", ["-R", "a+rX,go-w", privateNpm]);
  }
  const release = join(
    base,
    "releases",
    `${Date.now()}-${randomBytes(4).toString("hex")}`,
  );
  await mkdir(release, { mode: 0o755 });
  for (const name of [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
    "drizzle.config.ts",
    "src",
    "public",
    "drizzle",
    "scripts",
  ]) {
    const path = join(options.sourceDir, name);
    if (!existsSync(path))
      throw new Error("Checkout incompleto para preparar release.");
    await cp(path, join(release, name), {
      recursive: true,
      filter: (file) =>
        !/(?:[.]test|[.]integration)[.][cm]?[jt]sx?$/.test(file),
    });
  }
  await run("chown", [
    "-R",
    `${identity.builder.uid}:${identity.builder.gid}`,
    release,
  ]);
  const tools = {
    node: join(base, "tools/bin/node"),
    npm: join(privateNpm, "bin/npm-cli.js"),
  };
  const env = {
    PATH: `${join(base, "tools/bin")}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
    npm_config_cache: "/var/cache/guardian-bay/npm",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  console.info(
    "[Dependências] npm ci como usuário de build, usando package-lock.",
  );
  await run(
    "runuser",
    [
      "-u",
      "guardian-bay-build",
      "--",
      tools.node,
      tools.npm,
      "ci",
      "--include=dev",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: release, env },
  );
  return { directory: release, tools, env };
}
