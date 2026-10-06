import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { products } from "./products";
import { users } from "./users";

export const cartItems = pgTable(
  "cart_items",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").default(1).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.productId] }),
    check("cart_items_quantity", sql`${table.quantity} BETWEEN 1 AND 99`),
  ],
);
