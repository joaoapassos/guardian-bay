CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin" varchar(8) NOT NULL,
	"storage_key" varchar(41),
	"remote_url" text,
	"mime" varchar(32) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"source_photo_id" varchar(100),
	"author_name" varchar(200),
	"author_url" text,
	"source_url" text,
	"sha256" varchar(64) NOT NULL,
	"pixel_hash" varchar(64) NOT NULL,
	"perceptual_hash" varchar(16) NOT NULL,
	CONSTRAINT "product_media_origin" CHECK ("product_media"."origin" IN ('upload','unsplash')),
	CONSTRAINT "product_media_dimensions" CHECK ("product_media"."width" BETWEEN 1 AND 20000 AND "product_media"."height" BETWEEN 1 AND 20000 AND "product_media"."width"::bigint * "product_media"."height" <= 20000000),
	CONSTRAINT "product_media_size" CHECK ("product_media"."byte_size" BETWEEN 1 AND 5242880),
	CONSTRAINT "product_media_hashes" CHECK ("product_media"."sha256" ~ '^[0-9a-f]{64}$' AND "product_media"."pixel_hash" ~ '^[0-9a-f]{64}$' AND "product_media"."perceptual_hash" ~ '^[0-9a-f]{16}$'),
	CONSTRAINT "product_media_source" CHECK ((
    "product_media"."origin" = 'upload' AND "product_media"."storage_key" IS NOT NULL AND "product_media"."storage_key" ~ '^[0-9a-f-]{36}\.webp$' AND "product_media"."remote_url" IS NULL AND "product_media"."uploaded_by" IS NOT NULL AND "product_media"."mime" = 'image/webp' AND "product_media"."source_photo_id" IS NULL
  ) OR (
    "product_media"."origin" = 'unsplash' AND "product_media"."remote_url" IS NOT NULL AND "product_media"."author_url" IS NOT NULL AND "product_media"."source_url" IS NOT NULL AND "product_media"."storage_key" IS NULL AND "product_media"."remote_url" ~ '^https://images[.]unsplash[.]com/' AND "product_media"."source_photo_id" IS NOT NULL AND "product_media"."author_name" IS NOT NULL AND "product_media"."author_url" ~ '^https://unsplash[.]com/' AND "product_media"."source_url" ~ '^https://unsplash[.]com/' AND "product_media"."mime" IN ('image/jpeg','image/png','image/webp') AND "product_media"."expires_at" IS NULL
  ))
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seed_run_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seed_name_key" varchar(120);--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_photo_unique" ON "product_media" USING btree ("source_photo_id") WHERE "product_media"."source_photo_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_storage_unique" ON "product_media" USING btree ("storage_key") WHERE "product_media"."storage_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "product_media_sha_idx" ON "product_media" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "product_media_pixel_idx" ON "product_media" USING btree ("pixel_hash");--> statement-breakpoint
CREATE INDEX "product_media_uploader_idx" ON "product_media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "product_media_expiry_idx" ON "product_media" USING btree ("expires_at") WHERE "product_media"."expires_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_media_id_product_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."product_media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_media_id_idx" ON "products" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "products_seed_run_idx" ON "products" USING btree ("seed_run_id") WHERE "products"."seed_run_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_seed_name_unique" ON "products" USING btree ("seed_name_key") WHERE "products"."seed_name_key" IS NOT NULL;