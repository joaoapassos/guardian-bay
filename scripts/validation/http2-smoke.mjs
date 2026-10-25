import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:http2";
import { join } from "node:path";
import { labDirectory, labLease, labOrigin } from "./scope.mjs";

const lease = labLease();
const fixtures = JSON.parse(
  readFileSync(join(labDirectory, "load-fixtures.json"), "utf8"),
);
assert.equal(fixtures.runId, lease.runId);
const client = connect(labOrigin, {
  ca: readFileSync(join(labDirectory, "cert.pem")),
});
client.on("error", () => {});
const get = (headers) =>
  new Promise((resolve, reject) => {
    const req = client.request({ ":path": "/account", ...headers });
    let result;
    let bytes = 0;
    req.setTimeout(10000, () => req.destroy(new Error("HTTP2 smoke deadline")));
    req.on("response", (headers) => {
      result = headers;
    });
    req.on("data", (chunk) => {
      bytes += chunk.length;
    });
    req.once("error", reject);
    req.once("end", () => resolve({ headers: result, bytes }));
    req.end();
  });
try {
  const own = await get({
    cookie: `__Host-guardian-session=${fixtures.users[0].token}`,
  });
  assert.equal(own.headers[":status"], 200);
  assert.ok(own.bytes > 0);
  assert.ok(own.headers["content-security-policy"]);
  assert.equal((await get({})).headers[":status"], 307);
  assert.equal(
    (await get({ ":authority": "evil.invalid" })).headers[":status"],
    400,
  );
  assert.equal(
    (await get({ ":authority": "127.0.0.1:3449", host: "evil.invalid" }))
      .headers[":status"],
    400,
  );
  writeFileSync(
    `docs/validation/epic13-http2-smoke-${Date.now()}.json`,
    `${JSON.stringify({ runId: lease.runId, status: "PASS", authenticated: 200, anonymous: 307, foreignAuthority: 400, conflictingHost: 400, cspPresent: true, note: "Real TLS HTTP2 read checks, no cookies or HTML exported; mutation transport covered separately by existing production gates" }, null, 2)}\n`,
  );
  console.info(
    "HTTP2 authenticated, anonymous, authority and CSP smoke passed",
  );
} finally {
  client.destroy();
}
