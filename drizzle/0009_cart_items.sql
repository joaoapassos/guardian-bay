CREATE TABLE "cart_items" (
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "cart_items_user_id_product_id_pk" PRIMARY KEY("user_id","product_id"),
	CONSTRAINT "cart_items_quantity" CHECK ("cart_items"."quantity" BETWEEN 1 AND 99)
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;