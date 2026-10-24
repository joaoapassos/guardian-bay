import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { join } from "node:path";
import { argon2id, hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { errorClass, instancePorts } from "./diagnostic-contract.mjs";
import {
  assertScope,
  databaseUrl,
  labDirectory,
  labLease,
  labOrigin,
} from "./scope.mjs";

assertScope(process.env.LAB_BASE_URL, process.env.TEST_DATABASE_URL);
mkdirSync(labDirectory, { recursive: true });
const command = process.argv[2];
const fixturePath = join(labDirectory, "fixtures.json");
const leasePath = join(labDirectory, "lease.json");
const sql = postgres(databaseUrl, { max: 2, onnotice: () => {} });
try {
  const [cluster] =
    await sql`SELECT current_setting('data_directory') AS directory, current_setting('server_version_num') AS version, inet_server_port() AS port`;
  const normalize = (path) =>
    realpathSync(path).replaceAll("\\", "/").toLowerCase();
  assert.equal(
    normalize(cluster.directory),
    normalize(join(labDirectory, "postgres")),
    "Refusing an unrelated PostgreSQL cluster",
  );
  assert.equal(cluster.port, 55442);
  assert.equal(Math.trunc(Number(cluster.version) / 10000), 18);
  if (command === "seed") {
    assert.ok(
      !existsSync(fixturePath),
      "Fixtures already exist; retain or clean the owned run first",
    );
    const runId = randomUUID();
    const sha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
    assert.equal(sha.status, 0);
    const lease = {
      runId,
      sha: sha.stdout.trim(),
      createdAt: new Date().toISOString(),
      origin: labOrigin,
      database: databaseUrl,
    };
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    const password = "Guardian Bay laboratory passphrase 2026";
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });
    const fixtures = await sql.begin(async (tx) => {
      const users = [];
      for (const name of ["a", "b", "admin"]) {
        const email = `${name}.${runId}@lab.example.test`;
        const [user] =
          await tx`INSERT INTO users(email,password_hash,role) VALUES (${email},${passwordHash},${name === "admin" ? "admin" : "customer"}) RETURNING id`;
        const token = randomBytes(32).toString("hex");
        await tx`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(token).digest("hex")},${user.id},clock_timestamp()+interval '8 hours')`;
        const [card] =
          await tx`INSERT INTO saved_test_cards(user_id,fixture_id,brand,last4,expiry_month,expiry_year) VALUES (${user.id},'test-1','TEST','0001',12,2099) RETURNING id`;
        users.push({
          name,
          id: user.id,
          email,
          token,
          cardId: card.id,
          provisionedSession: true,
        });
      }
      const [category] =
        await tx`INSERT INTO categories(name) VALUES (${`Lab ${runId}`}) RETURNING id`;
      const products = [];
      for (const [name, amount, stock] of [
        ["Normal", 1200, 100000],
        ["Last unit", 1200, 1],
        ["Declined", 1000000, 1000],
      ]) {
        const [product] =
          await tx`INSERT INTO products(name,category_id,amount,is_published) VALUES (${`Lab ${name} ${runId}`},${category.id},${amount},true) RETURNING id`;
        await tx`INSERT INTO inventory(product_id,available_quantity) VALUES (${product.id},${stock})`;
        products.push({ name, id: product.id, initialStock: stock });
      }
      return { runId, users, categoryId: category.id, products };
    });
    writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`, {
      mode: 0o600,
    });
    writeFileSync(fixturePath, `${JSON.stringify(fixtures, null, 2)}\n`, {
      mode: 0o600,
    });
    console.info(
      "Owned synthetic fixtures created; credentials remain in the ignored laboratory directory.",
    );
  } else if (command === "serve") {
    labLease();
    const { countDiagnostic } = await import("./runtime-observer.mjs");
    assert.ok(existsSync(".next/BUILD_ID"), "Production build required");
    const certPath = join(labDirectory, "cert.pem");
    const keyPath = join(labDirectory, "key.pem");
    if (!existsSync(certPath)) {
      const openssl =
        process.env.SECURITY_OPENSSL_PATH ??
        (process.platform === "win32"
          ? "C:/Program Files/Git/usr/bin/openssl.exe"
          : "openssl");
      const generated = spawnSync(
        openssl,
        [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-nodes",
          "-keyout",
          keyPath,
          "-out",
          certPath,
          "-days",
          "1",
          "-subj",
          "/CN=localhost",
          "-addext",
          "subjectAltName=IP:127.0.0.1,DNS:localhost",
        ],
        {
          stdio: "ignore",
          windowsHide: true,
          env: {
            ...process.env,
            ...(process.platform === "win32"
              ? { OPENSSL_CONF: "C:/Program Files/Git/usr/ssl/openssl.cnf" }
              : {}),
          },
        },
      );
      assert.equal(
        generated.status,
        0,
        "Local TLS certificate generation failed",
      );
    }
    await sql.end();
    const ports = instancePorts(process.env.LAB_APP_INSTANCES);
    let upstreamIndex = 0;
    const apps = ports.map((port) =>
      spawn(
        process.execPath,
        [
          "--import",
          "./scripts/validation/runtime-observer.mjs",
          "node_modules/next/dist/bin/next",
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            NODE_ENV: "production",
            LAB_OBSERVER_ROLE: "app",
          },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      ),
    );
    for (const app of apps)
      app.stderr.on("data", (chunk) =>
        countDiagnostic(`app.stderr.${errorClass(chunk).toLowerCase()}`),
      );
    const proxy = createServer(
      { key: readFileSync(keyPath), cert: readFileSync(certPath) },
      (request, response) => {
        countDiagnostic("proxy.requests");
        response.on("finish", () =>
          countDiagnostic(`proxy.status.${response.statusCode}`),
        );
        if (
          request.headers.host !== "127.0.0.1:3449" ||
          !request.url?.startsWith("/") ||
          request.url.startsWith("//")
        ) {
          response.writeHead(400);
          response.end();
          return;
        }
        const headers = { ...request.headers };
        for (const name of Object.keys(headers))
          if (
            name.startsWith("x-forwarded-") ||
            ["forwarded", "x-real-ip"].includes(name)
          )
            delete headers[name];
        const upstream = httpRequest(
          {
            hostname: "127.0.0.1",
            port: ports[upstreamIndex++ % ports.length],
            method: request.method,
            path: request.url,
            headers,
            timeout: 15000,
          },
          (result) => {
            response.writeHead(result.statusCode, result.headers);
            result.pipe(response);
          },
        );
        upstream.on("timeout", () => {
          countDiagnostic("upstream.timeout");
          upstream.destroy();
        });
        upstream.on("error", (error) => {
          countDiagnostic(
            `upstream.error.${errorClass(error.code).toLowerCase()}`,
          );
          if (!response.headersSent) response.writeHead(502);
          response.end();
        });
        request.on("aborted", () => upstream.destroy());
        request.pipe(upstream);
      },
    );
    proxy.on("connection", () => countDiagnostic("proxy.connections"));
    proxy.on("tlsClientError", (error) =>
      countDiagnostic(
        `proxy.tls_error.${errorClass(error.code).toLowerCase()}`,
      ),
    );
    let started = false;
    const ready = new Set();
    for (const app of apps)
      app.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("Ready in")) ready.add(app.pid);
        if (!started && ready.size === apps.length) {
          started = true;
          proxy.listen(3449, "127.0.0.1", () => {
            writeFileSync(
              join(labDirectory, "processes.json"),
              JSON.stringify({
                supervisor: process.pid,
                app: apps[0].pid,
                apps: apps.map((app) => app.pid),
                ports,
                startedAt: new Date().toISOString(),
              }),
            );
            console.info("LAB_READY https://127.0.0.1:3449");
          });
        }
      });
    const shutdown = () => {
      proxy.closeAllConnections();
      if (proxy.listening) proxy.close();
      for (const app of apps) app.kill();
    };
    proxy.on("error", () => {
      console.error("Laboratory proxy startup failed");
      process.exitCode = 1;
      shutdown();
    });
    for (const app of apps)
      app.on("error", () => {
        console.error("Laboratory app startup failed");
        process.exitCode = 1;
        shutdown();
      });
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    for (const app of apps)
      app.on("exit", (code) => {
        shutdown();
        process.exit(code ?? 1);
      });
    setTimeout(() => {
      if (!started) {
        console.error("Laboratory startup timed out");
        shutdown();
      }
    }, 30000).unref();
  } else if (command === "status") {
    const lease = labLease();
    const [version] =
      await sql`SELECT current_setting('server_version') AS version`;
    console.info(
      JSON.stringify({
        runId: lease.runId,
        sha: lease.sha,
        postgres: version.version,
      }),
    );
  } else throw new Error("Use seed, serve or status");
} finally {
  await sql.end();
}
