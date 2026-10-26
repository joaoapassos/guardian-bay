import { emitKeypressEvents } from "node:readline";

export function readTerminalSecret({
  input = process.stdin,
  output = process.stdout,
} = {}) {
  if (!input.isTTY || typeof input.setRawMode !== "function")
    return Promise.reject(
      new Error(
        "Execute em terminal interativo para cadastrar a senha sem eco.",
      ),
    );
  return new Promise((done, reject) => {
    const wasRaw = Boolean(input.isRaw),
      wasPaused = input.isPaused();
    let value = "";
    let ended = false;
    emitKeypressEvents(input);
    const cleanup = () => {
      input.removeListener("keypress", onKey);
      process.removeListener("SIGINT", abort);
      process.removeListener("SIGTERM", abort);
      input.setRawMode(wasRaw);
      if (wasPaused) input.pause();
      output.write("\n");
    };
    const finish = (error) => {
      if (ended) return;
      ended = true;
      cleanup();
      if (error) reject(error);
      else done(value);
      value = "";
    };
    const abort = () =>
      finish(new Error("Cadastro cancelado; terminal restaurado."));
    const onKey = (text, key = {}) => {
      if (key.ctrl && (key.name === "c" || key.name === "d")) return abort();
      if (key.name === "return" || key.name === "enter") return finish();
      if (key.name === "backspace") {
        if (value) {
          value = [...value].slice(0, -1).join("");
          output.write("\b \b");
        }
        return;
      }
      if (
        key.ctrl ||
        key.meta ||
        key.name === "escape" ||
        !text ||
        text.startsWith("\u001b")
      )
        return;
      value += text;
      if (value.length > 256)
        return finish(
          new Error("Senha excede o limite técnico de128 caracteres Unicode."),
        );
      output.write("*".repeat([...text].length));
    };
    input.on("keypress", onKey);
    process.once("SIGINT", abort);
    process.once("SIGTERM", abort);
    input.setRawMode(true);
    input.resume();
    output.write("Senha do admin: ");
  });
}
