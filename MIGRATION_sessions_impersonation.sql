-- Impersonación superadmin → tenant (solo sesión, ver ARCHITECTURE_SAAS.md).
-- La sesión del superadmin pasa a actuar como el usuario target: user_id = target,
-- e impersonator_user_id guarda al superadmin real para poder revertir.
-- ON DELETE SET NULL: si se borra el superadmin, la sesión no se cae (solo pierde
-- el "volver a").

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS impersonator_user_id uuid
  REFERENCES users(id) ON DELETE SET NULL;
