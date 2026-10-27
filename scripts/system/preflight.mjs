import { existsSync, readFileSync } from "node:fs";
import { connect, isIP } from "node:net";
import { networkInterfaces } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export function parseInitOptions(args) {
  const options = {
    dbPort: 5433,
    appPort: 3000,
    host: "localhost",
    adminEmail: "admin@guardianbay.com.br",
    installDir: "/opt/guardian-bay",
    sourceDir: process.cwd(),
    npmCli: process.env.npm_execpath,
    dryRun: false,
  };
  const used = new Set();
  const fields = {
    "--db-port": "dbPort",
    "--app-port": "appPort",
    "--host": "host",
    "--admin-email": "adminEmail",
    "--install-dir": "installDir",
    "--source-dir": "sourceDir",
    "--npm-cli": "npmCli",
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    const key = fields[arg];
    if (!key || used.has(key) || args[i + 1] === undefined)
      throw new Error(
        "Argumento inválido. Use --dry-run, --host IP-local, --db-port, --app-port, --admin-email ou --install-dir.",
      );
    used.add(key);
    options[key] = args[++i];
  }
  for (const key of ["dbPort", "appPort"]) {
    if (
      !/^\d+$/.test(String(options[key])) ||
      Number(options[key]) < 1024 ||
      Number(options[key]) > 65535
    )
      throw new Error("Porta inválida.");
    options[key] = Number(options[key]);
  }
  if (options.dbPort === options.appPort)
    throw new Error("Portas de banco e aplicação devem ser distintas.");
  if (
    options.host !== "localhost" &&
    !(
      isIP(options.host) === 4 &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(options.host)
    )
  )
    throw new Error(
      "Host deve ser localhost ou IPv4 privado/local; DNS não é configurado.",
    );
  if (!/^\/opt\/guardian-bay(?:-[a-z0-9-]+)?$/.test(options.installDir))
    throw new Error(
      "Diretório de instalação deve ser /opt/guardian-bay ou /opt/guardian-bay-NOME.",
    );
  options.adminEmail = options.adminEmail.trim().toLowerCase();
  if (
    options.adminEmail.length > 254 ||
    !/^[!-~]+@[!-~]+\.[!-~]+$/.test(options.adminEmail) ||
    /[\s'"\\]/.test(options.adminEmail)
  )
    throw new Error("E-mail administrativo inválido.");
  options.sourceDir = resolve(options.sourceDir);
  if (
    [...options.sourceDir].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new Error("Caminho de origem inválido.");
  return options;
}
export function ubuntuCodename(release) {
  const field = (name) => {
    const matches = [
      ...release.matchAll(
        new RegExp(
          `^${name}=(?:"([^"\\r\\n]*)"|'([^'\\r\\n]*)'|([^'"\\r\\n]*))\\r?$`,
          "gm",
        ),
      ),
    ];
    return matches.length === 1
      ? (matches[0][1] ?? matches[0][2] ?? matches[0][3])
      : undefined;
  };
  if (field("ID") !== "ubuntu") return undefined;
  const version = field("VERSION_ID");
  if (version === "24.04") return "noble";
  if (version === "26.04") return "resolute";
  return undefined;
}
export function supportedPlatform({ platform, arch, release, node, systemd }) {
  const [major, minor] = node.split(".").map(Number);
  return (
    platform === "linux" &&
    arch === "x64" &&
    Boolean(ubuntuCodename(release)) &&
    (major > 24 || (major === 24 && minor >= 19)) &&
    systemd
  );
}
export function inspectPlatform() {
  return {
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    systemd: existsSync("/run/systemd/system"),
    release: existsSync("/etc/os-release")
      ? readFileSync("/etc/os-release", "utf8")
      : "",
  };
}
export function validateSource(options) {
  const pkg = JSON.parse(
    readFileSync(join(options.sourceDir, "package.json"), "utf8"),
  );
  if (
    pkg.name !== "guardian-bay" ||
    !existsSync(join(options.sourceDir, "package-lock.json")) ||
    !existsSync(join(options.sourceDir, "drizzle/meta/_journal.json"))
  )
    throw new Error("Execute na raiz de um checkout completo do Guardian Bay.");
  const candidates = [
    options.npmCli,
    join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
    "/usr/share/nodejs/npm/bin/npm-cli.js",
  ];
  for (const path of candidates.filter(Boolean))
    if (isAbsolute(path) && existsSync(path)) {
      const npmRoot = dirname(dirname(path));
      const npm = JSON.parse(
        readFileSync(join(npmRoot, "package.json"), "utf8"),
      );
      if (npm.name === "npm" && Number(npm.version.split(".")[0]) >= 10)
        return { ...options, npmCli: resolve(path) };
    }
  throw new Error(
    "npm10+ não encontrado. Execute pelo npm run system:init com Node24.19+.",
  );
}
export function hostIsLocal(host) {
  return (
    host === "localhost" ||
    host.startsWith("127.") ||
    Object.values(networkInterfaces())
      .flat()
      .some((entry) => entry?.address === host)
  );
}
export function portInUse(port, host = "127.0.0.1") {
  return new Promise((done) => {
    const socket = connect({ port, host });
    const finish = (value) => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}
