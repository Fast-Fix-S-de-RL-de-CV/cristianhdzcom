CREATE TABLE "membership_credit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"delta_cents" integer NOT NULL,
	"new_balance_cents" integer NOT NULL,
	"source_membership_id" uuid,
	"source_order_id" uuid,
	"note" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"lifetime_accrued_cents" integer DEFAULT 0 NOT NULL,
	"lifetime_redeemed_cents" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(20) NOT NULL,
	"label" varchar(40) NOT NULL,
	"emoji" varchar(8) NOT NULL,
	"price_usd_monthly" integer NOT NULL,
	"price_usd_yearly" integer,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"credit_accrual_percent" integer DEFAULT 50 NOT NULL,
	"tagline" text,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge_color" varchar(30),
	"max_seats" integer,
	"active_members" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_price_id_monthly" varchar(120),
	"stripe_price_id_yearly" varchar(120),
	CONSTRAINT "membership_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_slug" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"billing_cycle" varchar(10) DEFAULT 'monthly' NOT NULL,
	"price_usd" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_start" timestamp with time zone DEFAULT now() NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"stripe_subscription_id" varchar(120),
	"stripe_customer_id" varchar(120),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price_usd" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "included_in_membership" varchar(20);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recording_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "included_in_membership" varchar(20);--> statement-breakpoint
ALTER TABLE "membership_credit_history" ADD CONSTRAINT "membership_credit_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_credit_history" ADD CONSTRAINT "membership_credit_history_source_membership_id_memberships_id_fk" FOREIGN KEY ("source_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_credit_history" ADD CONSTRAINT "membership_credit_history_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_credits" ADD CONSTRAINT "membership_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_history_user_idx" ON "membership_credit_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_status_idx" ON "memberships" USING btree ("status");