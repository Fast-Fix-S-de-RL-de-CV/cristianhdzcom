-- Migration: event_rsvps
-- Persists which users have RSVP'd ("Apuntarme") to which events.
-- Matches Drizzle table `eventRsvps` in src/db/schema.ts.

CREATE TABLE IF NOT EXISTS event_rsvps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_event_user_idx
  ON event_rsvps (event_id, user_id);
