ALTER TABLE "products" ADD COLUMN "image_key" varchar(16);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_key" CHECK ("products"."image_key" IN ('lock', 'shield'));