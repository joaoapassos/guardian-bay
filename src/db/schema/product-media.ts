import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    origin: varchar("origin", { length: 8 }).notNull(),
    storageKey: varchar("storage_key", { length: 41 }),
    mime: varchar("mime", { length: 32 }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: integer("byte_size").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    pixelHash: varchar("pixel_hash", { length: 64 }).notNull(),
    perceptualHash: varchar("perceptual_hash", { length: 16 }).notNull(),
  },
  (table) => [
    check("product_media_origin", sql`${table.origin} = 'upload'`),
    check(
      "product_media_dimensions",
      sql`${table.width} BETWEEN 1 AND 20000 AND ${table.height} BETWEEN 1 AND 20000 AND ${table.width}::bigint * ${table.height} <= 20000000`,
    ),
    check("product_media_size", sql`${table.byteSize} BETWEEN 1 AND 5242880`),
    check(
      "product_media_hashes",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$' AND ${table.pixelHash} ~ '^[0-9a-f]{64}$' AND ${table.perceptualHash} ~ '^[0-9a-f]{16}$'`,
    ),
    check(
      "product_media_source",
      sql`${table.origin} = 'upload' AND ${table.storageKey} IS NOT NULL AND ${table.storageKey} ~ '^[0-9a-f-]{36}\\.webp$' AND ${table.uploadedBy} IS NOT NULL AND ${table.mime} = 'image/webp'`,
    ),
    uniqueIndex("product_media_storage_unique")
      .on(table.storageKey)
      .where(sql`${table.storageKey} IS NOT NULL`),
    index("product_media_sha_idx").on(table.sha256),
    index("product_media_pixel_idx").on(table.pixelHash),
    index("product_media_uploader_idx").on(table.uploadedBy),
    index("product_media_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
  ],
);
