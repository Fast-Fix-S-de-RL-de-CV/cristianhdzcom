-- Imagen de portada para servicios/empresas (además del video/glyph existentes).
-- Las imágenes de "tres caminos" y "método" viven en el jsonb site_settings.home_sections
-- (no requieren columna).
ALTER TABLE services ADD COLUMN IF NOT EXISTS cover_url text;
