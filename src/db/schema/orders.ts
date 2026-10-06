import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    checkoutKey: uuid("checkout_key").notNull(),
    status: varchar("status", { length: 16 })
      .default("PENDING_PAYMENT")
      .notNull(),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("orders_user_checkout_unique").on(table.userId, table.checkoutKey),
    check(
      "orders_status",
      sql`${table.status} IN ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED')`,
    ),
    check(
      "orders_total",
      sql`${table.totalAmount} BETWEEN 1 AND 21260088105300`,
    ),
    check("orders_currency", sql`${table.currency} = 'BRL'`),
    index("orders_user_created_idx").on(
      table.userId,
      table.createdAt,
      table.id,
    ),
  ],
);
