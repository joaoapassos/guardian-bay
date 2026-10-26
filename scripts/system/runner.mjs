import { spawn } from "node:child_process";
import { basename } from "node:path";

export async function run(
  command,
  args = [],
  {
    cwd,
    env,
    input,
    capture = false,
    allowFailure = false,
    sensitive = false,
    timeout = 1200000,
  } = {},
) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      shell: false,
      stdio: [
        input === undefined ? "inherit" : "pipe",
        capture || sensitive ? "pipe" : "inherit",
        capture || sensitive ? "pipe" : "inherit",
      ],
    });
    let output = "",
      exceeded = false;
    const timer =
      timeout > 0
        ? setTimeout(() => {
            child.kill("SIGTERM");
          }, timeout)
        : undefined;
    if (capture || sensitive) {
      child.stdout.on("data", (chunk) => {
        if (!sensitive) {
          output += chunk;
          if (output.length > 1048576) {
            exceeded = true;
            child.kill();
          }
        }
      });
      child.stderr.on("data", () => {});
    }
    if (input !== undefined) {
      child.stdin.on("error", () => {});
      child.stdin.end(input);
    }
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error(`Não foi possível iniciar ${basename(command)}.`));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if ((code !== 0 || exceeded) && !allowFailure)
        reject(
          new Error(
            `Etapa ${basename(command)} falhou; nenhuma credencial foi exibida.`,
          ),
        );
      else done({ code, output });
    });
  });
}
