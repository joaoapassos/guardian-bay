import "server-only";

import { parseDatabasePoolMax } from "./database-pool";
import { validateDatabaseUrl } from "./database-url";

export function getDatabasePoolMax(): number {
  return parseDatabasePoolMax(process.env.DATABASE_POOL_MAX);
}

export function getDatabaseUrl(): string {
  return validateDatabaseUrl(process.env.DATABASE_URL);
}
