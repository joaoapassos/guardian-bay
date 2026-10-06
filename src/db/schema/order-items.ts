import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const orderItems = pgTable(
  "order_items",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    // Historical reference only: catalog lifecycle cannot destroy the snapshot.
    productId: uuid("product_id").notNull(),
    productName: varchar("product_name", { length: 120 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitAmount: integer("unit_amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.productId] }),
    check("order_items_quantity", sql`${table.quantity} BETWEEN 1 AND 99`),
    check("order_items_price", sql`${table.unitAmount} > 0`),
    check("order_items_currency", sql`${table.currency} = 'BRL'`),
    check(
      "order_items_name",
      sql`length(trim(${table.productName})) BETWEEN 1 AND 120`,
    ),
    check(
      "order_items_subtotal",
      sql`${table.subtotalAmount} = ${table.unitAmount}::bigint * ${table.quantity} AND ${table.subtotalAmount} BETWEEN 1 AND 212600881053`,
    ),
  ],
);
