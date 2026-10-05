import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { validateDatabaseUrl } from "./src/lib/env/database-url";

loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/**/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: validateDatabaseUrl(process.env.DATABASE_URL),
  },
});
