import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  auditEventTypes,
  auditOutcomes,
  auditTargetTypes,
} from "@/lib/audit/events";

// Historical references deliberately have no FK: identity/catalog lifecycle
// must not rewrite or erase an audit trail. No free-form payload column.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventType: varchar("event_type", { length: 64 })
      .$type<(typeof auditEventTypes)[number]>()
      .notNull(),
    outcome: varchar("outcome", { length: 24 })
      .$type<(typeof auditOutcomes)[number]>()
      .notNull(),
    actorUserId: uuid("actor_user_id"),
    targetType: varchar("target_type", { length: 16 }).$type<
      (typeof auditTargetTypes)[number]
    >(),
    targetId: uuid("target_id"),
    correlationId: uuid("correlation_id").notNull(),
  },
  (table) => [
    check(
      "audit_event_type",
      sql`${table.eventType} IN ('auth.login.succeeded','auth.password.changed','auth.sessions.revoked','auth.abuse.threshold_reached','admin.category.created','admin.category.updated','admin.product.created','admin.product.updated','admin.product.published','admin.product.unpublished','admin.inventory.updated','order.completed')`,
    ),
    check(
      "audit_outcome",
      sql`${table.outcome} IN ('SUCCESS','FAILED','THRESHOLD_REACHED')`,
    ),
    check(
      "audit_target",
      sql`(${table.targetType} IS NULL AND ${table.targetId} IS NULL) OR (${table.targetType} IN ('user','category','product','inventory','order') AND ${table.targetId} IS NOT NULL)`,
    ),
    check(
      "audit_event_shape",
      sql`(${table.eventType} = 'auth.abuse.threshold_reached' AND ${table.outcome} = 'THRESHOLD_REACHED' AND ${table.actorUserId} IS NULL AND ${table.targetType} IS NULL AND ${table.targetId} IS NULL) OR (${table.actorUserId} IS NOT NULL AND ${table.targetId} IS NOT NULL AND ${table.targetType} IS NOT NULL AND ((${table.eventType} IN ('auth.login.succeeded','auth.password.changed','auth.sessions.revoked') AND ${table.targetType} = 'user' AND ${table.targetId} = ${table.actorUserId} AND ${table.outcome} = 'SUCCESS') OR (${table.eventType} IN ('admin.category.created','admin.category.updated') AND ${table.targetType} = 'category' AND ${table.outcome} = 'SUCCESS') OR (${table.eventType} IN ('admin.product.created','admin.product.updated','admin.product.published','admin.product.unpublished') AND ${table.targetType} = 'product' AND ${table.outcome} = 'SUCCESS') OR (${table.eventType} = 'admin.inventory.updated' AND ${table.targetType} = 'inventory' AND ${table.outcome} = 'SUCCESS') OR (${table.eventType} = 'order.completed' AND ${table.targetType} = 'order' AND ${table.outcome} IN ('SUCCESS','FAILED'))))`,
    ),
    index("audit_occurred_idx").on(table.occurredAt, table.id),
    index("audit_event_occurred_idx").on(table.eventType, table.occurredAt),
    index("audit_actor_occurred_idx").on(table.actorUserId, table.occurredAt),
    index("audit_target_occurred_idx").on(table.targetId, table.occurredAt),
  ],
);
