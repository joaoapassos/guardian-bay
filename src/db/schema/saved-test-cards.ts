import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const savedTestCards = pgTable(
  "saved_test_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fixtureId: varchar("fixture_id", { length: 16 }).notNull(),
    brand: varchar("brand", { length: 8 }).notNull(),
    last4: varchar("last4", { length: 4 }).notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("saved_test_cards_user_fixture").on(t.userId, t.fixtureId),
    check(
      "saved_test_cards_fixture",
      sql`${t.brand} = 'TEST' AND ((${t.fixtureId} = 'test-1' AND ${t.last4} = '0001') OR (${t.fixtureId} = 'test-2' AND ${t.last4} = '0002') OR (${t.fixtureId} = 'test-3' AND ${t.last4} = '0003'))`,
    ),
    check(
      "saved_test_cards_expiry",
      sql`${t.expiryMonth} BETWEEN 1 AND 12 AND ${t.expiryYear} BETWEEN 2026 AND 2099`,
    ),
  ],
);
