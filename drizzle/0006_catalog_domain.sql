CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "categories_name" CHECK (length("categories"."name") BETWEEN 1 AND 80 AND "categories"."name" !~ '(^[[:space:]]|[[:space:]]$)'),
	CONSTRAINT "categories_revision" CHECK ("categories"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "products_name" CHECK (length("products"."name") BETWEEN 1 AND 120 AND "products"."name" !~ '(^[[:space:]]|[[:space:]]$)'),
	CONSTRAINT "products_description" CHECK (length("products"."description") <= 2000),
	CONSTRAINT "products_amount" CHECK ("products"."amount" > 0),
	CONSTRAINT "products_currency" CHECK ("products"."currency" = 'BRL'),
	CONSTRAINT "products_revision" CHECK ("products"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "products_public_id_idx" ON "products" USING btree ("id") WHERE "products"."is_published" = true;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");