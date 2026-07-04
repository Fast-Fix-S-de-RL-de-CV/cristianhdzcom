-- Contenido configurable del Home por tenant (ver src/lib/home-sections.ts).
-- Solo agrega la columna. La resolución del default vive en código:
--   NULL + slug 'cristianhdz'  → render del JSX ORIGINAL (queda idéntico).
--   NULL + otro slug           → default genérico.
--   objeto                     → config del tenant.
-- Por eso NO se siembra nada aquí (cristianhdz debe quedar en NULL).

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS home_sections jsonb;
