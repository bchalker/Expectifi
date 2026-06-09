-- Full calculator plan state for cross-device sync (authenticated users).
CREATE TABLE IF NOT EXISTS user_plan_state (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_plan_state_updated_at ON user_plan_state (updated_at);
