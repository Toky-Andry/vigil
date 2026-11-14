CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE servers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT UNIQUE NOT NULL,
  ip             INET,
  os             TEXT,
  api_key_prefix TEXT NOT NULL,
  api_key_hash   TEXT NOT NULL,
  last_seen_at   TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE metrics (
  server_id  UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  ts         TIMESTAMPTZ NOT NULL,
  cpu_pct    REAL,
  ram_pct    REAL,
  disk_pct   REAL,
  load1      REAL,
  net_rx_bps BIGINT,
  net_tx_bps BIGINT,
  PRIMARY KEY (server_id, ts)
);
CREATE INDEX metrics_ts_idx ON metrics (ts);

CREATE TABLE alert_rules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  metric    TEXT NOT NULL,            -- cpu_pct, ram_pct, disk_pct
  operator  TEXT NOT NULL DEFAULT '>',
  threshold REAL NOT NULL,
  duration_s INT NOT NULL DEFAULT 300,
  severity  TEXT NOT NULL DEFAULT 'warning',
  enabled   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE incidents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id    UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  method       TEXT NOT NULL,         -- static, ewma, iforest, heartbeat
  metric       TEXT,
  severity     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',
  message      TEXT,
  ai_summary   TEXT,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE TABLE experiments (            -- pannes injectées pour tes mesures
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  scenario    TEXT NOT NULL,
  injected_at TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ
);