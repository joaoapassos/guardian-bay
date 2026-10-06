import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { abuseOperations } from "@/lib/abuse/policy";

export const abuseBudgets = pgTable(
  "abuse_budgets",
  {
    userId: uuid("user_id").notNull(),
    operation: varchar("operation", { length: 24 })
      .$type<(typeof abuseOperations)[number]>()
      .notNull(),
    attempts: integer("attempts").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.operation] }),
    check(
      "abuse_operation",
      sql`${table.operation} IN ('checkout','admin.catalog','admin.inventory')`,
    ),
    check(
      "abuse_attempts",
      sql`${table.attempts} BETWEEN 1 AND CASE WHEN ${table.operation}='checkout' THEN 5 ELSE 30 END`,
    ),
    check("abuse_window", sql`${table.expiresAt} > ${table.startedAt}`),
    index("abuse_expiry_idx").on(table.expiresAt),
  ],
);
