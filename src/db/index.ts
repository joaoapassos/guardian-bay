import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/env/server";

function createDatabase() {
  const url = getDatabaseUrl();
  return drizzle(postgres(url));
}

type Database = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as typeof globalThis & {
  guardianBayDatabase?: Database;
};

let database: Database | undefined;

// Lazy initialization keeps routes without database consumers independent of DB.
export function getDb(): Database {
  if (database) {
    return database;
  }

  if (process.env.NODE_ENV === "development") {
    database = globalForDatabase.guardianBayDatabase ?? createDatabase();
    globalForDatabase.guardianBayDatabase = database;
  } else {
    database = createDatabase();
  }

  return database;
}
