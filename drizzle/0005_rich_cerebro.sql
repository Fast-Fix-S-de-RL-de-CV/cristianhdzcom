ALTER TABLE "programs" ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "price_per_month" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "price_per_year" integer;