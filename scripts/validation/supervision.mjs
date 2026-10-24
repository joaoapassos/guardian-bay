import { spawnSync } from "node:child_process";

// Kill only the child tree created by this runner; never discover unrelated PIDs.
export function stopChild(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      timeout: 5000,
      stdio: "ignore",
    });
  } else child.kill("SIGTERM");
}

export function supervise(child) {
  const interrupt = () => {
    stopChild(child);
    process.exit(130);
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  child.once("exit", () => {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  });
}

export async function boundedMonitor(operation, stop, milliseconds = 5000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Monitor deadline")),
          milliseconds,
        );
      }),
    ]);
  } catch {
    stop();
    return null;
  } finally {
    clearTimeout(timer);
  }
}
