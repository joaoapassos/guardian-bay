import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Schema is also loaded by Drizzle Kit; privileged access stays in db/index.ts.
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 8 }).default("customer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("users_role", sql`${table.role} IN ('customer', 'admin')`),
    check(
      "users_email_canonical",
      sql`${table.email} = lower(${table.email}) AND ${table.email} COLLATE "C" ~ '^[!-~]+$' AND ${table.email} ~ '^[^@]+@[^@]+$'`,
    ),
    check(
      "users_password_hash_format",
      sql`${table.passwordHash} ~ '^\\$argon2id\\$v=19\\$m=[1-9][0-9]*,p=[1-9][0-9]*,t=[1-9][0-9]*\\$[A-Za-z0-9+/]{22}\\$[A-Za-z0-9+/]{43}$'`,
    ),
  ],
);
