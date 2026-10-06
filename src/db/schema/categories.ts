import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    revision: integer("revision").default(1).notNull(),
  },
  (table) => [
    check(
      "categories_name",
      sql`length(${table.name}) BETWEEN 1 AND 80 AND ${table.name} !~ '(^[[:space:]]|[[:space:]]$)'`,
    ),
    check("categories_revision", sql`${table.revision} > 0`),
    uniqueIndex("categories_name_unique").on(sql`lower(${table.name})`),
  ],
);
