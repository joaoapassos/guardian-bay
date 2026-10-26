import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import { hash, verify } from "argon2";
import { authenticationPasswordSchema } from "../../src/features/auth/credential-policy.mjs";
import { passwordHashOptions } from "../../src/features/auth/password-hash-policy.mjs";
import { readTerminalSecret } from "./terminal-secret.mjs";

function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (value) => {
    input.isRaw = value;
  };
  const output = new PassThrough();
  let text = "";
  output.on("data", (data) => {
    text += data;
  });
  return {
    input,
    output,
    get text() {
      return text;
    },
  };
}
test("password input preserves spaces/Unicode, masks echo and restores terminal", async () => {
  const tty = terminal();
  const promise = readTerminalSecret(tty);
  tty.input.emit("keypress", "  á😀 x  ", {});
  tty.input.emit("keypress", "", { name: "return" });
  assert.equal(await promise, "  á😀 x  ");
  assert.equal(tty.input.isRaw, false);
  assert.equal(tty.input.listenerCount("keypress"), 0);
  assert.ok(!tty.text.includes("á😀 x"));
  const secret = authenticationPasswordSchema.parse(" x ");
  const hashed = await hash(secret, passwordHashOptions);
  assert.equal(await verify(hashed, " x "), true);
  assert.equal(await verify(hashed, "x"), false);
});
test("cancel/backspace restore raw mode without storing an admin", async () => {
  const tty = terminal();
  const promise = readTerminalSecret(tty);
  tty.input.emit("keypress", "a😀", {});
  tty.input.emit("keypress", "", { name: "backspace" });
  tty.input.emit("keypress", "", { name: "return" });
  assert.equal(await promise, "a");
  const cancelled = readTerminalSecret(tty);
  tty.input.emit("keypress", "", { ctrl: true, name: "c" });
  await assert.rejects(cancelled, /cancelado/);
  assert.equal(tty.input.isRaw, false);
  assert.equal(authenticationPasswordSchema.safeParse("").success, false);
  assert.equal(
    authenticationPasswordSchema.safeParse("a".repeat(129)).success,
    false,
  );
});
