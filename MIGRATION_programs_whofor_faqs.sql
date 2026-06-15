-- Migration: programs_whofor_faqs
-- Secciones editables por curso para la página pública:
--   who_for → "Este curso es para ti si…"  ([{ t, d }])
--   faqs    → Preguntas frecuentes           ([{ q, a }])
-- Matches `whoFor` / `faqs` in src/db/schema.ts (programs).

ALTER TABLE programs ADD COLUMN IF NOT EXISTS who_for jsonb DEFAULT '[]'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
