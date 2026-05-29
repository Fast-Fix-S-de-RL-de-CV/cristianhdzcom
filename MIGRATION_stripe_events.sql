-- Migration: stripe_events
-- Idempotencia de webhooks de Stripe. Guardamos el id de cada evento
-- procesado; si Stripe reentrega/duplica, lo ignoramos (evita doble crédito
-- de membresía y órdenes de auditoría duplicadas).
-- Matches Drizzle table `stripeEvents` in src/db/schema.ts.

CREATE TABLE IF NOT EXISTS stripe_events (
  id          varchar(80) PRIMARY KEY,
  type        varchar(80),
  created_at  timestamptz NOT NULL DEFAULT now()
);
