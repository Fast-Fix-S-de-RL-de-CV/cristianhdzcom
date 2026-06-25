-- Video de portada por empresa (se reproduce en loop, mudo, sobre el banner de la card).
ALTER TABLE services ADD COLUMN IF NOT EXISTS cover_video_url text;
