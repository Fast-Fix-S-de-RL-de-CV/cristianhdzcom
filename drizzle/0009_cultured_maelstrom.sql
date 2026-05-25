ALTER TABLE "posts" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "author_tier_at_post" varchar(20);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "min_tier_required" varchar(20);