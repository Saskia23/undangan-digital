CREATE TABLE IF NOT EXISTS rsvp_wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Tidak')),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count BETWEEN 0 AND 20),
  msg TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rsvp_event_ts
  ON rsvp_wishes (event_key, ts DESC, id DESC);
