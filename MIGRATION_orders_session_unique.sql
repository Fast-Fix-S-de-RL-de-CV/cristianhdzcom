-- Migration: orders_session_unique
-- Idempotencia de checkout de Stripe a nivel DB (defensa en profundidad).
-- finalizeCheckoutSession ya serializa webhook vs página de confirmación con
-- pg_advisory_xact_lock + re-check, pero este índice único por expresión
-- garantiza que una misma Checkout Session jamás cree dos orders aunque el
-- lock falle (los inserts usan onConflictDoNothing y devuelven el existente).
-- Matches uniqueIndex `orders_stripe_session_uniq` in src/db/schema.ts.
-- Pre-check (2026-06-10): 0 session ids duplicados en prod.

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_uniq
  ON orders ((metadata->>'stripeSessionId'))
  WHERE metadata->>'stripeSessionId' IS NOT NULL;
