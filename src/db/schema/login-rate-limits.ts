import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const loginRateLimits = pgTable(
  "login_rate_limits",
  {
    key: varchar("key", { length: 70 }).primaryKey(),
    attempts: integer("attempts").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "login_rate_limits_key",
      sql`${table.key} = 'global' OR ${table.key} ~ '^(email|reg):[0-9a-f]{64}$'`,
    ),
    check(
      "login_rate_limits_attempts",
      sql`${table.attempts} > 0 AND ${table.attempts} <= 20`,
    ),
    check(
      "login_rate_limits_window",
      sql`${table.expiresAt} > ${table.startedAt}`,
    ),
    index("login_rate_limits_expires_at_idx").on(table.expiresAt),
  ],
);
