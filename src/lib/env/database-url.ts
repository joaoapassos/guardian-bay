// Pure validation shared by the server-only accessor and Drizzle Kit.
// This module does not read environment variables.
export function validateDatabaseUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error("Configuração obrigatória ausente: DATABASE_URL");
  }

  try {
    const url = new URL(value);
    if (
      value !== value.trim() ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname ||
      url.pathname === "/" ||
      (url.port && (Number(url.port) < 1 || Number(url.port) > 65535))
    ) {
      throw new Error();
    }
  } catch {
    throw new Error("Configuração inválida: DATABASE_URL");
  }

  return value;
}
