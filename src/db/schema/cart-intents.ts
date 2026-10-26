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

// Short-lived anonymous intent. Only a hash of the opaque browser nonce is stored.
// No price, authority, identity or payment operation is persisted here.
export const cartIntents = pgTable(
  "cart_intents",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    productId: uuid("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    returnTo: varchar("return_to", { length: 1600 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    check("cart_intents_quantity", sql`${table.quantity} BETWEEN 1 AND 99`),
    check("cart_intents_hash", sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    index("cart_intents_expiry_idx").on(table.expiresAt),
  ],
);
