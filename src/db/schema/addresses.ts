import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export type ShippingAddressSnapshot = {
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: "BR";
};

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revision: integer("revision").default(1).notNull(),
    recipient: varchar("recipient", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 8 }).notNull(),
    street: varchar("street", { length: 160 }).notNull(),
    number: varchar("number", { length: 20 }).notNull(),
    complement: varchar("complement", { length: 100 }).default("").notNull(),
    neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 2 }).notNull(),
    country: varchar("country", { length: 2 }).default("BR").notNull(),
  },
  (table) => [
    index("addresses_user_idx").on(table.userId, table.id),
    check("addresses_revision", sql`${table.revision} > 0`),
    check("addresses_postal_code", sql`${table.postalCode} ~ '^[0-9]{8}$'`),
    check("addresses_country", sql`${table.country} = 'BR'`),
    check(
      "addresses_state",
      sql`${table.state} IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      "addresses_required",
      sql`length(trim(${table.recipient})) > 0 AND length(trim(${table.street})) > 0 AND length(trim(${table.number})) > 0 AND length(trim(${table.neighborhood})) > 0 AND length(trim(${table.city})) > 0`,
    ),
  ],
);
