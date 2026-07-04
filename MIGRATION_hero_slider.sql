-- Hero/slider del home configurable por tenant (fase 1).
-- Ver ARCHITECTURE_SAAS.md. Garantía: cristianhdz se queda con el hero 3D EXACTO
-- (hero_type='3d'); los demás usan el slider de medios por default.

-- ── Slides del hero (imágenes y/o video, por tenant) ──
CREATE TABLE IF NOT EXISTS hero_slides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  media_type    varchar(10) NOT NULL DEFAULT 'image',      -- image | video
  image_url     text,                                       -- imagen o poster del video
  video_url     text,                                       -- mp4/webm subido o URL YouTube/Vimeo
  title         varchar(160),
  subtitle      text,
  cta_label     varchar(60),
  cta_href      text,
  cta2_label    varchar(60),
  cta2_href     text,
  text_position varchar(20) NOT NULL DEFAULT 'center-center', -- {top|center|bottom}-{left|center|right}
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hero_slides_tenant_idx ON hero_slides (tenant_id, sort_order);

-- ── Config del hero por tenant (en site_settings, una fila por tenant) ──
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_type       varchar(20) NOT NULL DEFAULT 'slider'; -- slider | 3d | embed
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_3d_name    varchar(60);   -- override del texto grande del hero 3D (null = default)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_3d_subtitle varchar(80);  -- override del subtítulo del hero 3D
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_embed_html text;          -- reservado (fase 2: embed/script)
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_height     varchar(10) NOT NULL DEFAULT 'full';   -- sm | md | lg | full
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_image_fit  varchar(10) NOT NULL DEFAULT 'cover';  -- cover | contain

-- Preservar el hero 3D actual de cristianhdz (su fila de site_settings ya existe).
UPDATE site_settings SET hero_type = '3d'
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'cristianhdz');
