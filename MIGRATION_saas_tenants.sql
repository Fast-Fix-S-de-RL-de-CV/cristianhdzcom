-- ============================================================
-- SaaS mimarca.app — Fase 1: multi-tenancy
-- Idempotente. Crea tenants, agrega tenant_id a 25 tablas,
-- backfillea todo al tenant 'cristianhdz' y ajusta únicos.
-- ============================================================

BEGIN;

-- 0) stripe_events puede no existir en entornos viejos (se creó directo en prod)
CREATE TABLE IF NOT EXISTS stripe_events (
  id varchar(80) PRIMARY KEY,
  type varchar(80),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1) Tabla tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(60) NOT NULL,
  name varchar(120) NOT NULL,
  custom_domain varchar(140),
  domain_verified boolean NOT NULL DEFAULT false,
  cloudflare_zone_id varchar(64),
  cloudflare_nameservers jsonb,
  plan varchar(20) NOT NULL DEFAULT 'basico',
  plan_status varchar(20) NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_user_id uuid,
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_idx ON tenants (slug);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_domain_idx ON tenants (custom_domain) WHERE custom_domain IS NOT NULL;

-- 2) Seed del tenant cristianhdz (todo lo existente le pertenece)
INSERT INTO tenants (slug, name, custom_domain, domain_verified, plan, plan_status, status, branding)
SELECT
  'cristianhdz',
  'Cristian Hernández',
  'cristianhdz.com',
  true,
  'pro',
  'active',
  'active',
  '{
    "siteName": "Cristian Hernández",
    "accent": "#C8A951",
    "ink": "#0A1E3A",
    "bg": "#FBFAF5",
    "logoUrl": "/logo.png",
    "faviconUrl": "/favicon.png",
    "footerText": "Negocios y programación con IA.",
    "footerLinks": [],
    "social": {},
    "hideMimarcaBadge": true
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'cristianhdz');

-- 3) tenant_id en tablas de contenido
-- users: NULLABLE (NULL = usuario de plataforma / superadmin SaaS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug='cristianhdz') WHERE tenant_id IS NULL;

-- Resto: NOT NULL tras backfill
DO $$
DECLARE
  t text;
  tid uuid;
BEGIN
  SELECT id INTO tid FROM tenants WHERE slug='cristianhdz';
  FOREACH t IN ARRAY ARRAY[
    'programs','cohorts','enrollments','modules','lessons','categories','posts','comments',
    'events','membership_plans','memberships','blog_posts','coupons','stripe_events','orders',
    'leads','activity','services','books','resources','user_projects','payment_settings',
    'site_settings','certificates'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', t, tid);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', t || '_tenant_idx', t);
  END LOOP;
END $$;

-- Índice también para users
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id);

-- 4) Únicos: de globales → compuestos por tenant
-- users.email
DROP INDEX IF EXISTS users_email_idx;
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users (tenant_id, email) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_platform_email_idx ON users (email) WHERE tenant_id IS NULL;

-- programs.slug
DROP INDEX IF EXISTS programs_slug_idx;
CREATE UNIQUE INDEX IF NOT EXISTS programs_tenant_slug_idx ON programs (tenant_id, slug);

-- categories.slug (constraint por .unique())
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key;
DROP INDEX IF EXISTS categories_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_tenant_slug_idx ON categories (tenant_id, slug);

-- membership_plans.slug
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_slug_key;
DROP INDEX IF EXISTS membership_plans_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS membership_plans_tenant_slug_idx ON membership_plans (tenant_id, slug);

-- blog_posts.slug
DROP INDEX IF EXISTS blog_slug_idx;
CREATE UNIQUE INDEX IF NOT EXISTS blog_tenant_slug_idx ON blog_posts (tenant_id, slug);

-- coupons.code
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
DROP INDEX IF EXISTS coupons_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS coupons_tenant_code_idx ON coupons (tenant_id, code);

-- leads.email
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_key;
DROP INDEX IF EXISTS leads_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS leads_tenant_email_idx ON leads (tenant_id, email);

-- services.slug
DROP INDEX IF EXISTS services_slug_idx;
CREATE UNIQUE INDEX IF NOT EXISTS services_tenant_slug_idx ON services (tenant_id, slug);

-- books.slug
DROP INDEX IF EXISTS books_slug_idx;
CREATE UNIQUE INDEX IF NOT EXISTS books_tenant_slug_idx ON books (tenant_id, slug);

-- payment_settings / site_settings: una fila por tenant
CREATE UNIQUE INDEX IF NOT EXISTS payment_settings_tenant_idx ON payment_settings (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_tenant_idx ON site_settings (tenant_id);

-- 4.5) Secuencias: el PUT viejo insertaba site_settings con id=1 explícito,
-- lo que deja la secuencia en 1 → el primer insert de un tenant nuevo chocaría PK.
SELECT setval('site_settings_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM site_settings), 1));
SELECT setval('payment_settings_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM payment_settings), 1));

-- 5) Owner del tenant + superadmin de plataforma
UPDATE tenants SET owner_user_id = (
  SELECT id FROM users WHERE email='lic.cristianhdz@gmail.com' AND tenant_id IS NOT NULL LIMIT 1
) WHERE slug='cristianhdz' AND owner_user_id IS NULL;

-- Superadmin SaaS (tenant_id NULL) con el mismo hash del admin actual
INSERT INTO users (email, password_hash, name, role, tenant_id)
SELECT email, password_hash, name, 'superadmin', NULL
FROM users
WHERE email='lic.cristianhdz@gmail.com' AND tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE email='lic.cristianhdz@gmail.com' AND tenant_id IS NULL)
LIMIT 1;

COMMIT;
