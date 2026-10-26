import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { productMedia } from "./product-media";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").default("").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    revision: integer("revision").default(1).notNull(),
    imageKey: varchar("image_key", { length: 16 }),
    mediaId: uuid("media_id").references(() => productMedia.id, {
      onDelete: "restrict",
    }),
    seedRunId: uuid("seed_run_id"),
    seedNameKey: varchar("seed_name_key", { length: 120 }),
  },
  (table) => [
    check(
      "products_name",
      sql`length(${table.name}) BETWEEN 1 AND 120 AND ${table.name} !~ '(^[[:space:]]|[[:space:]]$)'`,
    ),
    check("products_description", sql`length(${table.description}) <= 2000`),
    check("products_amount", sql`${table.amount} > 0`),
    check("products_currency", sql`${table.currency} = 'BRL'`),
    check("products_revision", sql`${table.revision} > 0`),
    check("products_image_key", sql`${table.imageKey} IN ('lock', 'shield')`),
    index("products_public_id_idx")
      .on(table.id)
      .where(sql`${table.isPublished} = true`),
    index("products_category_id_idx").on(table.categoryId),
    index("products_media_id_idx").on(table.mediaId),
    index("products_seed_run_idx")
      .on(table.seedRunId)
      .where(sql`${table.seedRunId} IS NOT NULL`),
    uniqueIndex("products_seed_name_unique")
      .on(table.seedNameKey)
      .where(sql`${table.seedNameKey} IS NOT NULL`),
  ],
);
