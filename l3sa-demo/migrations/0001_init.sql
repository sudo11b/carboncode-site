-- L3SA demo schema. Dates are 'YYYY-MM-DD'; timestamps are UTC ISO-8601.

CREATE TABLE classes (
  id           INTEGER PRIMARY KEY,
  start_date   TEXT    NOT NULL,                 -- Monday
  end_date     TEXT    NOT NULL,                 -- Friday
  cert_type    TEXT    NOT NULL CHECK (cert_type IN ('SPRAT','IRATA','SPRAT/IRATA')),
  price_single INTEGER NOT NULL DEFAULT 1700,    -- whole USD
  price_dual   INTEGER NOT NULL DEFAULT 2300,
  capacity     INTEGER NOT NULL DEFAULT 8 CHECK (capacity > 0),
  notes        TEXT,
  CHECK (end_date >= start_date)
);

CREATE TABLE registrations (
  id            INTEGER PRIMARY KEY,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  level         TEXT NOT NULL CHECK (level IN ('1','2','3')),
  cert_choice   TEXT NOT NULL CHECK (cert_choice IN ('single','dual')),
  -- Which cert a 'single' student is going for. In a SPRAT/IRATA class a
  -- single-cert student could be after either one, so the form asks.
  single_cert   TEXT CHECK (single_cert IN ('SPRAT','IRATA')),
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  status        TEXT NOT NULL CHECK (status IN ('registered','standby','cancelled')),
  standby_since TEXT,                            -- orders the standby list
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_reg_class_status ON registrations (class_id, status);

CREATE TABLE info_requests (
  id         INTEGER PRIMARY KEY,
  class_id   INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  message    TEXT,
  language   TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  handled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE email_log (
  id         INTEGER PRIMARY KEY,
  to_address TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL,   -- reg_confirm | standby_confirm | admin_new_reg | info_admin | promoted | moved
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
