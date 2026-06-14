-- Migration: lessons_video_url
-- Guarda la URL cruda del video tal como la pega el admin, aunque todavía no
-- sea válida. Así se puede editar el curso como borrador sin perder lo escrito;
-- el video se considera "completo" solo cuando video_provider + video_id están
-- resueltos. Matches `videoUrl` in src/db/schema.ts (lessons).

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url varchar(500);

-- Backfill: reconstruir la URL para las lecciones que ya tienen provider+id.
UPDATE lessons
SET video_url = CASE
    WHEN video_provider = 'vimeo'   AND video_id IS NOT NULL THEN 'https://vimeo.com/' || video_id
    WHEN video_provider = 'youtube' AND video_id IS NOT NULL THEN 'https://youtu.be/' || video_id
    ELSE video_url
  END
WHERE video_url IS NULL AND video_provider IS NOT NULL AND video_id IS NOT NULL;
