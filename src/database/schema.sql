-- ============================================================
-- QueueCTL Schema
-- ============================================================

-- Jobs table: the primary job store
CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT    PRIMARY KEY,
  command     TEXT    NOT NULL,
  state       TEXT    NOT NULL DEFAULT 'pending',
  attempts    INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  retry_after TEXT    DEFAULT NULL,   -- ISO timestamp; NULL = ready immediately
  worker_pid  INTEGER DEFAULT NULL,   -- PID of the worker currently executing this job
  output      TEXT    DEFAULT NULL    -- Combined stdout+stderr of last execution
);

-- Indexes for the hot query paths
CREATE INDEX IF NOT EXISTS idx_jobs_state           ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_state_retry     ON jobs(state, retry_after);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at      ON jobs(created_at);

-- Workers heartbeat table: each live worker process has one row.
-- Used by the recovery loop to detect crashed workers.
CREATE TABLE IF NOT EXISTS workers (
  pid            INTEGER PRIMARY KEY,
  hostname       TEXT    NOT NULL DEFAULT '',
  started_at     TEXT    NOT NULL,
  last_heartbeat TEXT    NOT NULL
);

-- Config table: persisted key-value pairs
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default config (INSERT OR IGNORE = never overwrite user changes)
INSERT OR IGNORE INTO config(key, value) VALUES ('max_retries',  '3');
INSERT OR IGNORE INTO config(key, value) VALUES ('backoff_base', '2');
