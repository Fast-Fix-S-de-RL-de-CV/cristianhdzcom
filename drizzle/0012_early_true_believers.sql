CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"domain" varchar(120),
	"kind" varchar(30) DEFAULT 'saas' NOT NULL,
	"tagline" varchar(80),
	"description" text,
	"glyph" varchar(4),
	"hue" integer DEFAULT 22 NOT NULL,
	"badge" varchar(40),
	"metric_label" varchar(80),
	"price_label" varchar(60),
	"cta_label" varchar(60) DEFAULT 'Ver SaaS →' NOT NULL,
	"cta_url" text,
	"is_cta_card" boolean DEFAULT false NOT NULL,
	"show_live_badge" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");