CREATE TABLE "login_rate_limits" (
	"key" varchar(70) PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "login_rate_limits_key" CHECK ("login_rate_limits"."key" = 'global' OR "login_rate_limits"."key" ~ '^email:[0-9a-f]{64}$'),
	CONSTRAINT "login_rate_limits_attempts" CHECK ("login_rate_limits"."attempts" > 0 AND "login_rate_limits"."attempts" <= 20),
	CONSTRAINT "login_rate_limits_window" CHECK ("login_rate_limits"."expires_at" > "login_rate_limits"."started_at")
);
--> statement-breakpoint
CREATE INDEX "login_rate_limits_expires_at_idx" ON "login_rate_limits" USING btree ("expires_at");