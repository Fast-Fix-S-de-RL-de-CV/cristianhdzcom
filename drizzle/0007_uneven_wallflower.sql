ALTER TABLE "books" ADD COLUMN "price_compare_usd" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "price_bundle_usd" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "has_digital" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "has_physical" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "stock_physical" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "digital_file_url" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_bundle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "bundle_includes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "accent" varchar(20) DEFAULT 'accent' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "badge" varchar(40);