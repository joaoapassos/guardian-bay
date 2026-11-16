import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Only IDs written by the simulator are eligible as synthetic actors or targets.
export const simulationRecords = pgTable(
  "simulation_records",
  {
    id: uuid("id").primaryKey(),
    kind: varchar("kind", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "simulation_records_kind",
      sql`${table.kind} IN ('user', 'category', 'product', 'order')`,
    ),
    index("simulation_records_kind_created_idx").on(
      table.kind,
      table.createdAt,
    ),
  ],
);
