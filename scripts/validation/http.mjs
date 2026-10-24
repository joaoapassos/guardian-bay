import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { request } from "node:https";
import { join } from "node:path";
import { labDirectory, labLease, labOrigin } from "./scope.mjs";

export function fixtures() {
  const lease = labLease();
  const data = JSON.parse(
    readFileSync(join(labDirectory, "fixtures.json"), "utf8"),
  );
  assert.equal(data.runId, lease.runId);
  return data;
}
export function transport(
  path,
  { token, headers = {}, body, method = "GET" } = {},
) {
  labLease();
  assert.ok(path.startsWith("/") && !path.startsWith("//"));
  return new Promise((resolve, reject) => {
    const outgoing = request(
      labOrigin + path,
      {
        method,
        ca: readFileSync(join(labDirectory, "cert.pem")),
        headers: {
          ...(token ? { cookie: `__Host-guardian-session=${token}` } : {}),
          ...headers,
          ...(body ? { "content-length": Buffer.byteLength(body) } : {}),
        },
        timeout: 15000,
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 4 * 1024 * 1024)
            outgoing.destroy(new Error("Response cap exceeded"));
          else chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    outgoing.on("timeout", () => outgoing.destroy(new Error("HTTP timeout")));
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

export function actionResult(text) {
  for (const line of text.split("\n")) {
    const marker = line.indexOf(":");
    if (marker < 0) continue;
    try {
      const value = JSON.parse(line.slice(marker + 1));
      if (value && typeof value.success === "boolean") return value;
    } catch {
      /* Flight also contains non-JSON records. */
    }
  }
  return null;
}

export async function replay(
  name,
  input,
  { token, origin = labOrigin, headers = {} } = {},
) {
  const captures = JSON.parse(
    readFileSync(join(labDirectory, "captures.json"), "utf8"),
  );
  const capture = captures[name];
  assert.ok(capture?.actionId, `Real action capture missing: ${name}`);
  assert.match(capture.actionId, /^[a-f0-9]{40,64}$/);
  const response = await transport(capture.path, {
    method: "POST",
    token,
    headers: {
      "next-action": capture.actionId,
      "content-type": "text/plain;charset=UTF-8",
      accept: "text/x-component",
      origin,
      ...headers,
    },
    body: JSON.stringify([input]),
  });
  return { ...response, result: actionResult(response.text) };
}
