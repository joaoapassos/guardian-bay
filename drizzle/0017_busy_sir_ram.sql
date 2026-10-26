CREATE TABLE "cart_intents" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"return_to" varchar(1600) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "cart_intents_quantity" CHECK ("cart_intents"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "cart_intents_hash" CHECK ("cart_intents"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "saved_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand" varchar(10) NOT NULL,
	"last4" varchar(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_payment_methods_brand" CHECK ("saved_payment_methods"."brand" IN ('VISA', 'MASTERCARD', 'AMEX')),
	CONSTRAINT "saved_payment_methods_last4" CHECK ("saved_payment_methods"."last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "saved_payment_methods_expiry" CHECK ("saved_payment_methods"."expiry_month" BETWEEN 1 AND 12 AND "saved_payment_methods"."expiry_year" BETWEEN 2000 AND 2099)
);
--> statement-breakpoint
ALTER TABLE "order_payments" DROP CONSTRAINT "order_payments_mask";--> statement-breakpoint
ALTER TABLE "order_payments" ADD COLUMN "card_brand" varchar(16);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_name" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_cpf_encrypted" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "buyer_cpf_last2" varchar(2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cpf_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cpf_last2" varchar(2);--> statement-breakpoint
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_intents_expiry_idx" ON "cart_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "saved_payment_methods_user_idx" ON "saved_payment_methods" USING btree ("user_id","id");--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_mask" CHECK (("order_payments"."method" = 'CARD' AND "order_payments"."card_last4" IS NOT NULL AND "order_payments"."card_last4" ~ '^[0-9]{4}$') OR ("order_payments"."method" <> 'CARD' AND "order_payments"."card_last4" IS NULL));