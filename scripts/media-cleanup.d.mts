import type { Sql } from "postgres";
export function cleanupProductMedia(
  sql: Sql,
  limit?: number,
): Promise<{ media: number; files: number }>;
