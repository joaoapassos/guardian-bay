import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Display metadata for a simulation. No PAN, CVV, token or charging credential.
export const savedPaymentMethods = pgTable(
  "saved_payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brand: varchar("brand", { length: 10 }).notNull(),
    last4: varchar("last4", { length: 4 }).notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("saved_payment_methods_user_idx").on(table.userId, table.id),
    check(
      "saved_payment_methods_brand",
      sql`${table.brand} IN ('VISA', 'MASTERCARD', 'AMEX')`,
    ),
    check("saved_payment_methods_last4", sql`${table.last4} ~ '^[0-9]{4}$'`),
    check(
      "saved_payment_methods_expiry",
      sql`${table.expiryMonth} BETWEEN 1 AND 12 AND ${table.expiryYear} BETWEEN 2000 AND 2099`,
    ),
  ],
);
