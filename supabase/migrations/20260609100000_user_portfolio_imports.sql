-- Pro user CSV import blob (cross-device portfolio holdings).
CREATE TABLE IF NOT EXISTS user_portfolio_imports (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_portfolio_imports_updated_at
  ON user_portfolio_imports (updated_at);
