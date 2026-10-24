import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { freemem, totalmem } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { connect as tlsConnect } from "node:tls";
import { errorClass } from "./diagnostic-contract.mjs";
import { labDirectory, labLease } from "./scope.mjs";

const lease = labLease();
const ca = readFileSync(join(labDirectory, "cert.pem"));
const results = [];
for (const mode of ["tcp", "tls"]) {
  assert.ok(
    freemem() / totalmem() >= 0.15,
    "Memory guard blocks admission control",
  );
  const errors = {};
  let connected = 0;
  const start = performance.now();
  await Promise.all(
    Array.from(
      { length: 500 },
      () =>
        new Promise((resolve) => {
          const socket =
            mode === "tcp"
              ? connect({ host: "127.0.0.1", port: 3449 })
              : tlsConnect({ host: "127.0.0.1", port: 3449, ca });
          let finished = false;
          const finish = (code) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            if (code) errors[code] = (errors[code] ?? 0) + 1;
            else connected++;
            socket.destroy();
            resolve();
          };
          const timer = setTimeout(() => finish("ETIMEDOUT"), 5000);
          socket.once(mode === "tcp" ? "connect" : "secureConnect", () =>
            finish(),
          );
          socket.once("error", (error) => finish(errorClass(error.code)));
        }),
    ),
  );
  results.push({
    mode,
    attempted: 500,
    connected,
    errors,
    wallMs: performance.now() - start,
  });
}
const topology = JSON.parse(
  readFileSync(join(labDirectory, "processes.json"), "utf8"),
);
writeFileSync(
  `docs/validation/epic13-tcp-admission-${Date.now()}.json`,
  `${JSON.stringify({ runId: lease.runId, backlog: topology.proxyBacklog ?? 511, scope: "Node generator transport control only, 500TCP then500TLS to the same owned3449listener; sockets closed immediately; noHTTP/product capacity claim", results }, null, 2)}\n`,
);
console.info(JSON.stringify(results));
