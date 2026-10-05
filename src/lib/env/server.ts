import "server-only";

import { validateDatabaseUrl } from "./database-url";

export function getDatabaseUrl(): string {
  return validateDatabaseUrl(process.env.DATABASE_URL);
}
