ALTER TABLE "product_media" DROP CONSTRAINT "product_media_origin";--> statement-breakpoint
ALTER TABLE "product_media" DROP CONSTRAINT "product_media_source";--> statement-breakpoint
DROP INDEX "product_media_photo_unique";--> statement-breakpoint
ALTER TABLE "product_media" DROP COLUMN "remote_url";--> statement-breakpoint
ALTER TABLE "product_media" DROP COLUMN "source_photo_id";--> statement-breakpoint
ALTER TABLE "product_media" DROP COLUMN "author_name";--> statement-breakpoint
ALTER TABLE "product_media" DROP COLUMN "author_url";--> statement-breakpoint
ALTER TABLE "product_media" DROP COLUMN "source_url";--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_origin" CHECK ("product_media"."origin" = 'upload');--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_source" CHECK ("product_media"."origin" = 'upload' AND "product_media"."storage_key" IS NOT NULL AND "product_media"."storage_key" ~ '^[0-9a-f-]{36}\.webp$' AND "product_media"."uploaded_by" IS NOT NULL AND "product_media"."mime" = 'image/webp');