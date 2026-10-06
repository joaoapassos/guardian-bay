CREATE TABLE "inventory" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "inventory_quantity" CHECK ("inventory"."available_quantity" BETWEEN 0 AND 2147483647),
	CONSTRAINT "inventory_revision" CHECK ("inventory"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "inventory" ("product_id", "available_quantity", "revision")
SELECT "id", 0, 1 FROM "products"
ON CONFLICT ("product_id") DO NOTHING;
