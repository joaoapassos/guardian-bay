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
import { orders } from "./orders";

export const orderPayments = pgTable(
  "order_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: varchar("method", { length: 8 }).notNull(),
    status: varchar("status", { length: 8 }).default("PENDING").notNull(),
    ruleVersion: integer("rule_version").default(1).notNull(),
    cardLast4: varchar("card_last4", { length: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    approvableAt: timestamp("approvable_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    unique("order_payments_order_unique").on(t.orderId),
    check(
      "order_payments_method",
      sql`${t.method} IN ('CARD', 'PIX', 'BOLETO')`,
    ),
    check(
      "order_payments_status",
      sql`${t.status} IN ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED')`,
    ),
    check("order_payments_rule", sql`${t.ruleVersion} = 1`),
    check(
      "order_payments_mask",
      sql`(${t.method} = 'CARD' AND ${t.cardLast4} IS NOT NULL AND ${t.cardLast4} IN ('0001', '0002', '0003')) OR (${t.method} <> 'CARD' AND ${t.cardLast4} IS NULL)`,
    ),
    check(
      "order_payments_times",
      sql`${t.approvableAt} >= ${t.createdAt} AND ${t.expiresAt} > ${t.approvableAt} AND (${t.completedAt} IS NULL OR ${t.completedAt} >= ${t.createdAt})`,
    ),
    check(
      "order_payments_completion",
      sql`(${t.status} = 'PENDING' AND ${t.completedAt} IS NULL) OR (${t.status} <> 'PENDING' AND ${t.completedAt} IS NOT NULL)`,
    ),
  ],
);
