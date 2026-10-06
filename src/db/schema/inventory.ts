import { sql } from "drizzle-orm";
import { check, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";

export const inventory = pgTable(
  "inventory",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "restrict" }),
    availableQuantity: integer("available_quantity").notNull().default(0),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [
    check(
      "inventory_quantity",
      sql`${table.availableQuantity} BETWEEN 0 AND 2147483647`,
    ),
    check("inventory_revision", sql`${table.revision} > 0`),
  ],
);
