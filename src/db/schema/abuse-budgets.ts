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
    lastAcceptedAt: timestamp("last_accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    attempts: integer("attempts").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.operation] }),
    check(
      "abuse_operation",
      sql`${table.operation} IN ('checkout','cart.write','admin.catalog','admin.media','admin.inventory','payment.cards','payment.confirm','profile.write')`,
    ),
    check(
      "abuse_attempts",
      sql`${table.attempts} BETWEEN 1 AND CASE ${table.operation} WHEN 'cart.write' THEN 60 WHEN 'checkout' THEN 5 WHEN 'payment.cards' THEN 10 WHEN 'profile.write' THEN 10 WHEN 'admin.media' THEN 10 WHEN 'payment.confirm' THEN 20 ELSE 30 END`,
    ),
    check("abuse_window", sql`${table.expiresAt} > ${table.startedAt}`),
    index("abuse_expiry_idx").on(table.expiresAt),
  ],
);
