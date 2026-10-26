export function localDemoDatabase(env = process.env) {
  if (env.GUARDIAN_LOCAL_DEMO !== "1")
    throw new Error(
      "Defina GUARDIAN_LOCAL_DEMO=1 somente na instalação local/demonstração.",
    );
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("Configure DATABASE_URL local explicitamente.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["/guardian_bay", "/guardian_bay_demo"].includes(url.pathname)
  )
    throw new Error(
      "Destino deve ser guardian_bay ou guardian_bay_demo em loopback; banco de testes não é aceito.",
    );
  return url.toString();
}
export async function loadLocalEnvironment(directory = process.cwd()) {
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(directory);
}
