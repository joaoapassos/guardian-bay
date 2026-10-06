CREATE TABLE "order_items" (
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(120) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	CONSTRAINT "order_items_order_id_product_id_pk" PRIMARY KEY("order_id","product_id"),
	CONSTRAINT "order_items_quantity" CHECK ("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_price" CHECK ("order_items"."unit_amount" > 0),
	CONSTRAINT "order_items_currency" CHECK ("order_items"."currency" = 'BRL'),
	CONSTRAINT "order_items_name" CHECK (length(trim("order_items"."product_name")) BETWEEN 1 AND 120),
	CONSTRAINT "order_items_subtotal" CHECK ("order_items"."subtotal_amount" = "order_items"."unit_amount"::bigint * "order_items"."quantity" AND "order_items"."subtotal_amount" BETWEEN 1 AND 212600881053)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"checkout_key" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"total_amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_user_checkout_unique" UNIQUE("user_id","checkout_key"),
	CONSTRAINT "orders_status" CHECK ("orders"."status" IN ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED')),
	CONSTRAINT "orders_total" CHECK ("orders"."total_amount" BETWEEN 1 AND 21260088105300),
	CONSTRAINT "orders_currency" CHECK ("orders"."currency" = 'BRL')
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at","id");