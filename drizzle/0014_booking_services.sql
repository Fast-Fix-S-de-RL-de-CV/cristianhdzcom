CREATE TABLE "booking_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(160) NOT NULL,
	"subtitle" varchar(220),
	"description" text,
	"host_name" varchar(120),
	"host_avatar_url" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_minutes" integer DEFAULT 10 NOT NULL,
	"min_notice_hours" integer DEFAULT 2 NOT NULL,
	"max_days_ahead" integer DEFAULT 30 NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/Mazatlan' NOT NULL,
	"location_type" varchar(30) DEFAULT 'virtual' NOT NULL,
	"location_label" varchar(200),
	"confirmation_text" text,
	"notification_email" varchar(320),
	"require_phone" boolean DEFAULT true NOT NULL,
	"require_email" boolean DEFAULT true NOT NULL,
	"availability" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "booking_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(80) DEFAULT 'America/Mazatlan' NOT NULL,
	"customer_name" varchar(160) NOT NULL,
	"customer_email" varchar(320),
	"customer_phone" varchar(60),
	"notes" text,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(30) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "booking_services"
	ADD CONSTRAINT "booking_services_tenant_id_tenants_id_fk"
	FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "booking_reservations"
	ADD CONSTRAINT "booking_reservations_tenant_id_tenants_id_fk"
	FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "booking_reservations"
	ADD CONSTRAINT "booking_reservations_service_id_booking_services_id_fk"
	FOREIGN KEY ("service_id") REFERENCES "public"."booking_services"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "booking_services_tenant_slug_idx" ON "booking_services" USING btree ("tenant_id","slug");
CREATE INDEX "booking_services_tenant_idx" ON "booking_services" USING btree ("tenant_id","sort_order");
CREATE INDEX "booking_reservations_service_time_idx" ON "booking_reservations" USING btree ("service_id","starts_at");
CREATE INDEX "booking_reservations_tenant_idx" ON "booking_reservations" USING btree ("tenant_id","created_at");
