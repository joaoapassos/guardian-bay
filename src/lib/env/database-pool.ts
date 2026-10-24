export function parseDatabasePoolMax(value: string | undefined): number {
  if (value === undefined) return 10;
  if (!/^(?:[1-9]|10)$/.test(value))
    throw new Error("Configuração inválida: DATABASE_POOL_MAX");
  return Number(value);
}
