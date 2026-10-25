CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"recipient" varchar(100) NOT NULL,
	"postal_code" varchar(8) NOT NULL,
	"street" varchar(160) NOT NULL,
	"number" varchar(20) NOT NULL,
	"complement" varchar(100) DEFAULT '' NOT NULL,
	"neighborhood" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"country" varchar(2) DEFAULT 'BR' NOT NULL,
	CONSTRAINT "addresses_revision" CHECK ("addresses"."revision" > 0),
	CONSTRAINT "addresses_postal_code" CHECK ("addresses"."postal_code" ~ '^[0-9]{8}$'),
	CONSTRAINT "addresses_country" CHECK ("addresses"."country" = 'BR'),
	CONSTRAINT "addresses_state" CHECK ("addresses"."state" IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
	CONSTRAINT "addresses_required" CHECK (length(trim("addresses"."recipient")) > 0 AND length(trim("addresses"."street")) > 0 AND length(trim("addresses"."number")) > 0 AND length(trim("addresses"."neighborhood")) > 0 AND length(trim("addresses"."city")) > 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address" jsonb;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id","id");