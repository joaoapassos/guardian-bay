import { accessSync, constants } from "node:fs";

// Preflight only: never print URLs/credentials or open a fallback connection.
try {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL é obrigatória.");
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/guardian_bay_test" ||
    (process.env.DATABASE_URL &&
      new URL(process.env.DATABASE_URL).pathname === url.pathname)
  )
    throw new Error("Banco PostgreSQL local dedicado obrigatório.");
  if (process.argv[2] === "browser") {
    if (!process.env.SECURITY_BROWSER_PATH)
      throw new Error(
        "SECURITY_BROWSER_PATH é obrigatório para o gate completo.",
      );
    accessSync(process.env.SECURITY_BROWSER_PATH, constants.X_OK);
    if (Number(process.versions.node.split(".")[0]) < 22)
      throw new Error("Gate HTTP/browser exige Node.js 22.12+ ou 24+.");
  } else if (process.argv[2] !== "integration") {
    throw new Error("Modo de preflight inválido.");
  }
  console.info("Ambiente explícito de testes validado.");
} catch {
  console.error(
    "Pré-requisito de testes ausente/inválido: TEST_DATABASE_URL local dedicado; no gate browser, SECURITY_BROWSER_PATH executável e Node.js 22.12+ ou 24+.",
  );
  process.exitCode = 1;
}
