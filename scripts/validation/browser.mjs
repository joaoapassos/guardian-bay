import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { labDirectory, labLease, labOrigin } from "./scope.mjs";

export async function withBrowser(operation) {
  labLease();
  const binary = process.env.SECURITY_BROWSER_PATH;
  assert.ok(binary && existsSync(binary), "Explicit Chrome binary required");
  const profile = join(labDirectory, `chrome-${randomUUID()}`);
  mkdirSync(profile, { recursive: true });
  const child = spawn(
    binary,
    [
      "--headless",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--ignore-certificate-errors",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  let socket;
  const pending = new Map();
  const events = new Set();
  try {
    const portFile = join(profile, "DevToolsActivePort");
    for (
      let i = 0;
      i < 200 && !existsSync(portFile) && child.exitCode === null;
      i++
    )
      await new Promise((r) => setTimeout(r, 50));
    assert.ok(existsSync(portFile), "Owned Chrome readiness timeout");
    const [port, path] = readFileSync(portFile, "utf8").trim().split(/\r?\n/);
    assert.match(port, /^\d{1,5}$/);
    assert.ok(path.startsWith("/devtools/browser/"));
    socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, timer } = pending.get(message.id);
        clearTimeout(timer);
        pending.delete(message.id);
        if (message.error) reject(new Error("CDP request failed"));
        else resolve(message.result);
      } else for (const handler of events) handler(message);
    });
    let id = 0;
    const call = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const current = ++id;
        const timer = setTimeout(() => {
          pending.delete(current);
          reject(new Error(`CDP timeout: ${method}`));
        }, 15000);
        pending.set(current, { resolve, reject, timer });
        socket.send(
          JSON.stringify({
            id: current,
            method,
            params,
            ...(sessionId ? { sessionId } : {}),
          }),
        );
      });
    const { targetId } = await call("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await call("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const send = (method, params) => call(method, params, sessionId);
    await send("Page.enable");
    await send("Network.enable");
    await send("Runtime.enable");
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      assert.ok(!result.exceptionDetails, "Browser expression failed");
      return result.result.value;
    };
    const wait = async (expression, label, timeout = 15000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`Browser wait failed: ${label}`);
    };
    const navigate = async (path) => {
      assert.ok(path.startsWith("/") && !path.startsWith("//"));
      await send("Page.navigate", { url: labOrigin + path });
      await wait(
        `location.origin===${JSON.stringify(labOrigin)} && location.pathname===${JSON.stringify(new URL(path, labOrigin).pathname)} && document.readyState==='complete' && !!document.querySelector('main')`,
        "navigation",
      );
    };
    await operation({ send, evaluate, wait, navigate, events });
  } finally {
    socket?.close();
    for (const { timer, reject } of pending.values()) {
      clearTimeout(timer);
      reject(new Error("Browser closing"));
    }
    child.kill();
  }
}
