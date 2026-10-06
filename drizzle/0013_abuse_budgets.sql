CREATE TABLE "abuse_budgets" (
	"user_id" uuid NOT NULL,
	"operation" varchar(24) NOT NULL,
	"attempts" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "abuse_budgets_user_id_operation_pk" PRIMARY KEY("user_id","operation"),
	CONSTRAINT "abuse_operation" CHECK ("abuse_budgets"."operation" IN ('checkout','admin.catalog','admin.inventory')),
	CONSTRAINT "abuse_attempts" CHECK ("abuse_budgets"."attempts" BETWEEN 1 AND CASE WHEN "abuse_budgets"."operation"='checkout' THEN 5 ELSE 30 END),
	CONSTRAINT "abuse_window" CHECK ("abuse_budgets"."expires_at" > "abuse_budgets"."started_at")
);
--> statement-breakpoint
CREATE INDEX "abuse_expiry_idx" ON "abuse_budgets" USING btree ("expires_at");