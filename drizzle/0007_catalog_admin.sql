ALTER TABLE "users" ADD COLUMN "role" varchar(8) DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role" CHECK ("users"."role" IN ('customer', 'admin'));