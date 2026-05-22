CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_publishable_key" text,
	"stripe_secret_key" text,
	"stripe_webhook_secret" text,
	"stripe_mode" varchar(10) DEFAULT 'test',
	"paypal_client_id" text,
	"paypal_client_secret" text,
	"paypal_mode" varchar(10) DEFAULT 'sandbox',
	"mp_access_token" text,
	"mp_public_key" text,
	"bank_accounts" jsonb DEFAULT '[]'::jsonb,
	"enable_stripe" boolean DEFAULT false NOT NULL,
	"enable_paypal" boolean DEFAULT false NOT NULL,
	"enable_mercadopago" boolean DEFAULT false NOT NULL,
	"enable_transfer" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
