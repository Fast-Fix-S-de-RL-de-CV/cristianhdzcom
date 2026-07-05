ALTER TABLE "booking_reservations"
	ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_name" varchar(120),
	"from_email" varchar(320),
	"reply_to_email" varchar(320),
	"smtp_host" varchar(200),
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"smtp_secure" boolean DEFAULT true NOT NULL,
	"smtp_user" varchar(320),
	"smtp_pass" text,
	"enable_smtp" boolean DEFAULT false NOT NULL,
	"enable_booking_reminders" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "email_settings"
	ADD CONSTRAINT "email_settings_tenant_id_tenants_id_fk"
	FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "email_settings_tenant_idx" ON "email_settings" USING btree ("tenant_id");
