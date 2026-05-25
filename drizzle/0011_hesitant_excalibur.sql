ALTER TABLE "events" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_evergreen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "evergreen_schedule_hint" varchar(120);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tagline" varchar(120);