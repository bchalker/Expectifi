import pg from 'pg'
import { isDuplicateColumn } from './dbQuery.js'

const { Pool } = pg

let pool: pg.Pool | null = null

function useStagingDb(): boolean {
  const v = process.env.USE_STAGING_DB?.toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function firstStagingOrProd(stagingKeys: string[], prodKey: string): string | undefined {
  if (useStagingDb()) {
    for (const k of stagingKeys) {
      const x = process.env[k]?.trim()
      if (x !== undefined && x.length > 0) return x
    }
  }
  const x = process.env[prodKey]?.trim()
  if (x !== undefined && x.length > 0) return x
  return undefined
}

function envFirst(keys: string[]): string | undefined {
  for (const k of keys) {
    const x = process.env[k]?.trim()
    if (x !== undefined && x.length > 0) return x
  }
  return undefined
}

export function getPool(): pg.Pool {
  if (!pool) {
    const url =
      firstStagingOrProd(['staging_DATABASE_URL', 'STAGING_DATABASE_URL'], 'DATABASE_URL') ??
      envFirst(['POSTGRES_URL', 'DATABASE_PRIVATE_URL'])

    if (url) {
      const useSsl =
        process.env.PGSSLMODE !== 'disable' &&
        (process.env.NODE_ENV === 'production' ||
          process.env.RAILWAY_ENVIRONMENT != null ||
          /railway|supabase|neon/i.test(url))
      pool = new Pool({
        connectionString: url,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      })
    } else {
      const host =
        firstStagingOrProd(['staging_PGHOST', 'STAGING_PGHOST'], 'PGHOST') ??
        envFirst(['POSTGRES_HOST', 'PGHOST']) ??
        '127.0.0.1'
      const portStr =
        firstStagingOrProd(['staging_PGPORT', 'STAGING_PGPORT'], 'PGPORT') ??
        envFirst(['POSTGRES_PORT', 'PGPORT'])
      const port = portStr ? Number(portStr) : 5432
      const user =
        firstStagingOrProd(['staging_PGUSER', 'STAGING_PGUSER'], 'PGUSER') ??
        envFirst(['POSTGRES_USER', 'PGUSER']) ??
        'postgres'
      const password =
        firstStagingOrProd(['staging_PGPASSWORD', 'STAGING_PGPASSWORD'], 'PGPASSWORD') ??
        envFirst(['POSTGRES_PASSWORD', 'PGPASSWORD']) ??
        ''
      const database =
        firstStagingOrProd(['staging_PGDATABASE', 'STAGING_PGDATABASE'], 'PGDATABASE') ??
        envFirst(['POSTGRES_DB', 'PGDATABASE']) ??
        'retirement_calculator'
      pool = new Pool({
        host,
        port,
        user,
        password,
        database,
        max: 10,
      })
    }
  }
  return pool
}

async function addColumnIfMissing(sql: string): Promise<void> {
  const p = getPool()
  const ifNotExistsSql = sql.includes('IF NOT EXISTS')
    ? sql
    : sql.replace('ADD COLUMN ', 'ADD COLUMN IF NOT EXISTS ')
  try {
    await p.query(ifNotExistsSql)
  } catch (e: unknown) {
    if (!isDuplicateColumn(e)) throw e
  }
}

export async function ensureSchema(): Promise<void> {
  const p = getPool()

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT NOT NULL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(512) NOT NULL,
      inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await p.query(`CREATE INDEX IF NOT EXISTS scenarios_user_id ON scenarios (user_id)`)

  try {
    await p.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL')
  } catch {
    /* already nullable */
  }

  await addColumnIfMissing('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN display_name VARCHAR(255)')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(64)')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(64)')
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN subscription_status VARCHAR(32)')
  await addColumnIfMissing(
    'ALTER TABLE users ADD COLUMN onboarding_done BOOLEAN NOT NULL DEFAULT FALSE',
  )
  await addColumnIfMissing('ALTER TABLE users ADD COLUMN user_prefs JSONB')

  await p.query(`
    CREATE TABLE IF NOT EXISTS plaid_items (
      id TEXT NOT NULL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      access_token_enc TEXT NOT NULL,
      institution_id TEXT,
      institution_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await p.query(`CREATE INDEX IF NOT EXISTS plaid_items_user_id ON plaid_items (user_id)`)

  await p.query(`
    CREATE TABLE IF NOT EXISTS truelayer_connections (
      id TEXT NOT NULL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      access_token_enc TEXT NOT NULL,
      refresh_token_enc TEXT,
      token_expires_at TIMESTAMPTZ,
      provider_id TEXT,
      institution_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await p.query(`CREATE INDEX IF NOT EXISTS truelayer_connections_user_id ON truelayer_connections (user_id)`)

  await p.query(`
    CREATE TABLE IF NOT EXISTS truelayer_accounts (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id TEXT NOT NULL REFERENCES truelayer_connections(id) ON DELETE CASCADE,
      display_name TEXT,
      account_type TEXT,
      currency TEXT,
      current_balance NUMERIC,
      available_balance NUMERIC,
      provider_id TEXT,
      raw_json JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, id)
    )
  `)
  await p.query(`CREATE INDEX IF NOT EXISTS truelayer_accounts_connection ON truelayer_accounts (connection_id)`)

  await p.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT NOT NULL PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  const backfill = await p.query(
    `INSERT INTO schema_migrations (id) VALUES ('onboarding_done_backfill') ON CONFLICT (id) DO NOTHING RETURNING id`,
  )
  if ((backfill.rowCount ?? 0) > 0) {
    await p.query('UPDATE users SET onboarding_done = TRUE')
  }
}
