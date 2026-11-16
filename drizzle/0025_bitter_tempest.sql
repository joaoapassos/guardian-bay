CREATE TABLE "simulation_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_records_kind" CHECK ("simulation_records"."kind" IN ('user', 'category', 'product', 'order'))
);
--> statement-breakpoint
CREATE INDEX "simulation_records_kind_created_idx" ON "simulation_records" USING btree ("kind","created_at");