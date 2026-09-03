CREATE TABLE IF NOT EXISTS activation_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  suffix TEXT NOT NULL,
  order_id TEXT,
  batch_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'revoked')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  activated_at INTEGER,
  client_hash TEXT,
  last_access_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_codes_order ON activation_codes(order_id);
CREATE INDEX IF NOT EXISTS idx_codes_batch ON activation_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON activation_codes(status);

CREATE TABLE IF NOT EXISTS activation_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_source_time ON activation_attempts(source_hash, created_at);
