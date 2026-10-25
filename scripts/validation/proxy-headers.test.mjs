import assert from "node:assert/strict";
import test from "node:test";
import {
  downstreamHeaders,
  proxyProtocol,
  upstreamConnectionLimit,
  upstreamHeaders,
} from "./proxy-headers.mjs";

test("upstream socket budget is explicit and bounded", () => {
  assert.equal(upstreamConnectionLimit(), Infinity);
  assert.equal(upstreamConnectionLimit("16"), 16);
  assert.throws(() => upstreamConnectionLimit("100000"));
});

test("proxy default and bounded protocol", () => {
  assert.equal(proxyProtocol(), "h1");
  assert.equal(proxyProtocol("h2"), "h2");
  assert.throws(() => proxyProtocol("anything"));
});
test("HTTP2 authority preserves original host and removes spoofed authority", () => {
  assert.deepEqual(
    upstreamHeaders({
      ":authority": "127.0.0.1:3449",
      ":method": "GET",
      "x-forwarded-host": "evil.test",
      forwarded: "bad",
      cookie: "synthetic",
      origin: "https://evil.test",
    }),
    {
      host: "127.0.0.1:3449",
      cookie: "synthetic",
      origin: "https://evil.test",
    },
  );
  assert.equal(upstreamHeaders({ ":authority": "evil.test" }), null);
  assert.equal(
    upstreamHeaders({ ":authority": "evil.test", host: "127.0.0.1:3449" }),
    null,
  );
  assert.deepEqual(
    downstreamHeaders(
      {
        connection: "keep-alive",
        "set-cookie": ["synthetic"],
        "content-security-policy": "strict",
      },
      true,
    ),
    { "set-cookie": ["synthetic"], "content-security-policy": "strict" },
  );
});
