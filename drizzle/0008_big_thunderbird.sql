CREATE TABLE "experience_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"reason" varchar(80) NOT NULL,
	"source_order_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" varchar(20) DEFAULT 'visitor' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lifetime_spend_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_ledger" ADD CONSTRAINT "experience_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_ledger" ADD CONSTRAINT "experience_ledger_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experience_ledger_user_idx" ON "experience_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_tier_idx" ON "users" USING btree ("tier");