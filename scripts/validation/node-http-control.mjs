import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { Agent, request } from "node:https";
import { freemem, totalmem } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { errorClass } from "./diagnostic-contract.mjs";
import { measuredPeak } from "./measurement-window.mjs";
import { databaseUrl, labDirectory, labLease, labOrigin } from "./scope.mjs";
import { assertIntegrity, openLabDb } from "./state.mjs";

const lease = labLease();
const scaAge =
  Date.now() - statSync(".vitest/dependencies-production.json").mtimeMs;
assert.ok(scaAge >= 0 && scaAge < 15 * 60 * 1000, "Fresh SCA gate required");
assert.equal(
  JSON.parse(readFileSync(".vitest/dependencies-production.json", "utf8"))
    .findings.length,
  0,
);
const data = JSON.parse(
  readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
);
assert.equal(data.runId, lease.runId);
assert.equal(
  databaseUrl,
  "postgresql://postgres@127.0.0.1:55442/guardian_bay_test",
);
const agent = new Agent({
  keepAlive: true,
  maxSockets: 500,
  maxFreeSockets: 500,
  ca: readFileSync(join(labDirectory, "cert.pem")),
});
const sql = await openLabDb();
const pending = new Set();
let aborted = false;
const cancel = () => {
  aborted = true;
  for (const req of pending)
    req.destroy(new Error("Control deadline or memory guard"));
};
const deadline = setTimeout(cancel, 30000);
const monitor = setInterval(() => {
  if (freemem() / totalmem() < 0.15) cancel();
}, 500);
const phases = [];
try {
  assert.ok(freemem() / totalmem() >= 0.15);
  for (const phase of ["warm", "measured"]) {
    const began = performance.now();
    const startedAt = Date.now();
    const rows = await Promise.all(
      Array.from(
        { length: 500 },
        (_, i) =>
          new Promise((resolve) => {
            const start = performance.now();
            let sent;
            let finished = false;
            const req = request(
              labOrigin + (i % 2 === 0 ? "/products" : "/account"),
              {
                agent,
                headers: {
                  cookie: `__Host-guardian-session=${data.users[i].token}`,
                },
                timeout: 10000,
              },
              (response) => {
                response.resume();
                response.once("end", () => finish(response.statusCode));
                response.once("aborted", () => finish(0, "ECONNRESET"));
              },
            );
            const finish = (status, code) => {
              if (finished) return;
              finished = true;
              pending.delete(req);
              resolve({
                status,
                code: code ?? null,
                fullMs: performance.now() - start,
                afterSendMs:
                  sent === undefined ? null : performance.now() - sent,
              });
            };
            pending.add(req);
            req.once("finish", () => {
              sent = performance.now();
            });
            req.once("timeout", () =>
              req.destroy(
                Object.assign(new Error("Request timeout"), {
                  code: "ETIMEDOUT",
                }),
              ),
            );
            req.once("error", (error) => finish(0, errorClass(error.code)));
            req.end();
          }),
      ),
    );
    const statuses = {};
    const errors = {};
    for (const row of rows) {
      statuses[row.status] = (statuses[row.status] ?? 0) + 1;
      if (row.code) errors[row.code] = (errors[row.code] ?? 0) + 1;
    }
    const sorted = rows
      .filter((r) => r.status === 200)
      .map((r) => r.afterSendMs)
      .sort((a, b) => a - b);
    phases.push({
      phase,
      startedAt,
      endedAt: Date.now(),
      requests: rows.length,
      statuses,
      errors,
      wallMs: performance.now() - began,
      afterSendP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? null,
      afterSendP99Ms: sorted[Math.floor(sorted.length * 0.99)] ?? null,
    });
    if (aborted || rows.some((r) => r.status !== 200)) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await assertIntegrity(sql);
  const topology = JSON.parse(
    readFileSync(join(labDirectory, "processes.json"), "utf8"),
  );
  const ownedPids = new Set([topology.supervisor, ...topology.apps]);
  for (const phase of phases) {
    let proxyPeak = 0;
    let singleAppPeak = 0;
    let observed = 0;
    for (const name of readdirSync(join(labDirectory, "observability")).filter(
      (n) => n.startsWith(lease.runId) && n.endsWith(".jsonl"),
    )) {
      for (const line of readFileSync(
        join(labDirectory, "observability", name),
        "utf8",
      ).split("\n")) {
        try {
          const sample = JSON.parse(line);
          if (
            !ownedPids.has(sample.pid) ||
            Date.parse(sample.at) < phase.startedAt ||
            Date.parse(sample.at) > phase.endedAt + 1500
          )
            continue;
          observed++;
          const peak = measuredPeak(sample, {
            start: phase.startedAt,
            end: phase.endedAt,
          });
          if (sample.role === "proxy") proxyPeak = Math.max(proxyPeak, peak);
          else singleAppPeak = Math.max(singleAppPeak, peak);
        } catch {
          /* Ignore an incomplete append. */
        }
      }
    }
    phase.observerSamples = observed;
    phase.proxyPeak = observed ? proxyPeak : null;
    phase.singleAppPeak = observed ? singleAppPeak : null;
  }
  writeFileSync(
    `docs/validation/epic13-node-http-control-${Date.now()}.json`,
    `${JSON.stringify({ runId: lease.runId, aborted, scope: "Independent Node HTTPS generator, fixed500realGETs per phase, strict certificate verification, own fixtures; timing after ClientRequest.finish differs from k6; diagnostic only, no5000capacity claim", phases }, null, 2)}\n`,
  );
  console.info(JSON.stringify({ aborted, phases }));
} finally {
  clearTimeout(deadline);
  clearInterval(monitor);
  agent.destroy();
  await sql.end();
}
