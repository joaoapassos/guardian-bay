CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"outcome" varchar(24) NOT NULL,
	"actor_user_id" uuid,
	"target_type" varchar(16),
	"target_id" uuid,
	"correlation_id" uuid NOT NULL,
	CONSTRAINT "audit_event_type" CHECK ("audit_events"."event_type" IN ('auth.login.succeeded','auth.password.changed','auth.sessions.revoked','auth.abuse.threshold_reached','admin.category.created','admin.category.updated','admin.product.created','admin.product.updated','admin.product.published','admin.product.unpublished','admin.inventory.updated','order.completed')),
	CONSTRAINT "audit_outcome" CHECK ("audit_events"."outcome" IN ('SUCCESS','FAILED','THRESHOLD_REACHED')),
	CONSTRAINT "audit_target" CHECK (("audit_events"."target_type" IS NULL AND "audit_events"."target_id" IS NULL) OR ("audit_events"."target_type" IN ('user','category','product','inventory','order') AND "audit_events"."target_id" IS NOT NULL)),
	CONSTRAINT "audit_event_shape" CHECK (("audit_events"."event_type" = 'auth.abuse.threshold_reached' AND "audit_events"."outcome" = 'THRESHOLD_REACHED' AND "audit_events"."actor_user_id" IS NULL AND "audit_events"."target_type" IS NULL AND "audit_events"."target_id" IS NULL) OR ("audit_events"."actor_user_id" IS NOT NULL AND "audit_events"."target_id" IS NOT NULL AND "audit_events"."target_type" IS NOT NULL AND (("audit_events"."event_type" IN ('auth.login.succeeded','auth.password.changed','auth.sessions.revoked') AND "audit_events"."target_type" = 'user' AND "audit_events"."target_id" = "audit_events"."actor_user_id" AND "audit_events"."outcome" = 'SUCCESS') OR ("audit_events"."event_type" IN ('admin.category.created','admin.category.updated') AND "audit_events"."target_type" = 'category' AND "audit_events"."outcome" = 'SUCCESS') OR ("audit_events"."event_type" IN ('admin.product.created','admin.product.updated','admin.product.published','admin.product.unpublished') AND "audit_events"."target_type" = 'product' AND "audit_events"."outcome" = 'SUCCESS') OR ("audit_events"."event_type" = 'admin.inventory.updated' AND "audit_events"."target_type" = 'inventory' AND "audit_events"."outcome" = 'SUCCESS') OR ("audit_events"."event_type" = 'order.completed' AND "audit_events"."target_type" = 'order' AND "audit_events"."outcome" IN ('SUCCESS','FAILED')))))
);
--> statement-breakpoint
CREATE INDEX "audit_occurred_idx" ON "audit_events" USING btree ("occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_occurred_idx" ON "audit_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_actor_occurred_idx" ON "audit_events" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_target_occurred_idx" ON "audit_events" USING btree ("target_id","occurred_at");