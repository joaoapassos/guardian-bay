ALTER TABLE "sessions" ADD COLUMN "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "sessions" SET "last_active_at" = "created_at";--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_activity" CHECK ("sessions"."last_active_at" >= "sessions"."created_at" AND "sessions"."last_active_at" < "sessions"."expires_at");
