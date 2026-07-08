ALTER TABLE "booking_services"
  ADD COLUMN "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  ADD COLUMN "price_usd" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "requires_payment" boolean DEFAULT false NOT NULL;

ALTER TABLE "booking_reservations"
  ADD COLUMN "stripe_session_id" varchar(120),
  ADD COLUMN "paid_at" timestamp with time zone,
  ADD COLUMN "expires_at" timestamp with time zone;

CREATE UNIQUE INDEX "booking_reservations_stripe_session_idx"
  ON "booking_reservations" USING btree ("stripe_session_id")
  WHERE "stripe_session_id" IS NOT NULL;

WITH tenant_row AS (
  SELECT id
  FROM "tenants"
  WHERE slug = 'cristianhdz'
     OR custom_domain IN ('cristianhdz.com', 'www.cristianhdz.com')
  ORDER BY created_at ASC
  LIMIT 1
),
upsert_service AS (
  INSERT INTO "booking_services" (
    tenant_id,
    slug,
    title,
    subtitle,
    description,
    host_name,
    currency,
    price_usd,
    requires_payment,
    duration_minutes,
    buffer_minutes,
    min_notice_hours,
    max_days_ahead,
    timezone,
    location_type,
    location_label,
    confirmation_text,
    notification_email,
    require_phone,
    require_email,
    availability,
    questions,
    is_active,
    sort_order,
    updated_at
  )
  SELECT
    id,
    'consultoria-it',
    'Consultoria IT',
    'Sesion privada para revisar despliegue, servidores, errores de codigo o el plan tecnico de tu proyecto digital.',
    'Agenda una consultoria tecnica de 30 minutos para resolver bloqueos de programacion, despliegue, arquitectura, servidores, errores en codigo, integraciones o decisiones tecnicas antes de lanzar tu producto digital.',
    'Cristian Hernandez',
    'USD',
    50,
    true,
    30,
    30,
    12,
    21,
    'America/Mazatlan',
    'virtual',
    'Videollamada privada. El enlace se coordina despues del pago.',
    'Tu sesion queda confirmada al completar el pago. Prepara links de repositorio, logs, captura del error o contexto del proyecto para aprovechar los 30 minutos.',
    'info@cristianhdz.com',
    true,
    true,
    '[
      {"day":1,"startTime":"10:00","endTime":"17:00","enabled":true},
      {"day":2,"startTime":"10:00","endTime":"17:00","enabled":true},
      {"day":3,"startTime":"10:00","endTime":"17:00","enabled":true},
      {"day":4,"startTime":"10:00","endTime":"17:00","enabled":true},
      {"day":5,"startTime":"10:00","endTime":"17:00","enabled":true}
    ]'::jsonb,
    '[
      {"id":"project_context","label":"Que proyecto quieres revisar?","type":"textarea","required":true},
      {"id":"main_blocker","label":"Cual es el bloqueo principal: despliegue, servidor, bug o arquitectura?","type":"textarea","required":true},
      {"id":"links","label":"Links utiles: repo, sitio, logs o capturas","type":"textarea","required":false}
    ]'::jsonb,
    true,
    0,
    now()
  FROM tenant_row
  ON CONFLICT (tenant_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    host_name = EXCLUDED.host_name,
    currency = EXCLUDED.currency,
    price_usd = EXCLUDED.price_usd,
    requires_payment = EXCLUDED.requires_payment,
    duration_minutes = EXCLUDED.duration_minutes,
    buffer_minutes = EXCLUDED.buffer_minutes,
    min_notice_hours = EXCLUDED.min_notice_hours,
    max_days_ahead = EXCLUDED.max_days_ahead,
    timezone = EXCLUDED.timezone,
    location_type = EXCLUDED.location_type,
    location_label = EXCLUDED.location_label,
    confirmation_text = EXCLUDED.confirmation_text,
    notification_email = EXCLUDED.notification_email,
    require_phone = EXCLUDED.require_phone,
    require_email = EXCLUDED.require_email,
    availability = EXCLUDED.availability,
    questions = EXCLUDED.questions,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING tenant_id
)
UPDATE "tenants"
SET branding = jsonb_set(
  COALESCE(branding, '{}'::jsonb),
  '{bookingPage}',
  '{
    "eyebrow":"Consultoria IT",
    "title":"Agenda una revision tecnica para tu proyecto digital.",
    "description":"Reserva una sesion privada para revisar despliegue, servidores, errores de codigo, arquitectura o funcionalidades antes de lanzar. Elige horario, deja contexto y paga en linea.",
    "primaryCtaLabel":"Agendar Consultoria IT",
    "secondaryCtaLabel":"Ver horarios",
    "catalogEyebrow":"Agenda",
    "catalogTitle":"Consultoria disponible"
  }'::jsonb,
  true
)
WHERE id IN (SELECT tenant_id FROM upsert_service);
