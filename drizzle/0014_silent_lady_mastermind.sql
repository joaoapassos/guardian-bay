CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" varchar(8) NOT NULL,
	"status" varchar(8) DEFAULT 'PENDING' NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"card_last4" varchar(4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approvable_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "order_payments_order_unique" UNIQUE("order_id"),
	CONSTRAINT "order_payments_method" CHECK ("order_payments"."method" IN ('CARD', 'PIX', 'BOLETO')),
	CONSTRAINT "order_payments_status" CHECK ("order_payments"."status" IN ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED')),
	CONSTRAINT "order_payments_rule" CHECK ("order_payments"."rule_version" = 1),
	CONSTRAINT "order_payments_mask" CHECK (("order_payments"."method" = 'CARD' AND "order_payments"."card_last4" IS NOT NULL AND "order_payments"."card_last4" IN ('0001', '0002', '0003')) OR ("order_payments"."method" <> 'CARD' AND "order_payments"."card_last4" IS NULL)),
	CONSTRAINT "order_payments_times" CHECK ("order_payments"."approvable_at" >= "order_payments"."created_at" AND "order_payments"."expires_at" > "order_payments"."approvable_at" AND ("order_payments"."completed_at" IS NULL OR "order_payments"."completed_at" >= "order_payments"."created_at")),
	CONSTRAINT "order_payments_completion" CHECK (("order_payments"."status" = 'PENDING' AND "order_payments"."completed_at" IS NULL) OR ("order_payments"."status" <> 'PENDING' AND "order_payments"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "saved_test_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fixture_id" varchar(16) NOT NULL,
	"brand" varchar(8) NOT NULL,
	"last4" varchar(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_test_cards_user_fixture" UNIQUE("user_id","fixture_id"),
	CONSTRAINT "saved_test_cards_fixture" CHECK ("saved_test_cards"."brand" = 'TEST' AND (("saved_test_cards"."fixture_id" = 'test-1' AND "saved_test_cards"."last4" = '0001') OR ("saved_test_cards"."fixture_id" = 'test-2' AND "saved_test_cards"."last4" = '0002') OR ("saved_test_cards"."fixture_id" = 'test-3' AND "saved_test_cards"."last4" = '0003'))),
	CONSTRAINT "saved_test_cards_expiry" CHECK ("saved_test_cards"."expiry_month" BETWEEN 1 AND 12 AND "saved_test_cards"."expiry_year" BETWEEN 2026 AND 2099)
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_status";--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_test_cards" ADD CONSTRAINT "saved_test_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status" CHECK ("orders"."status" IN ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED'));