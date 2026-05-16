import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function useStagingDb(): boolean {
  const v = process.env.USE_STAGING_DB?.toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** When USE_STAGING_DB is set, prefer staging_* keys, then fall back to production MYSQL_* / DATABASE_URL. */
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

/** Railway MySQL plugin uses MYSQLHOST (no underscore); also MYSQL_URL when services are linked. */
function envFirst(keys: string[]): string | undefined {
  for (const k of keys) {
    const x = process.env[k]?.trim()
    if (x !== undefined && x.length > 0) return x
  }
  return undefined
}

export function getPool(): mysql.Pool {
  if (!pool) {
    const url =
      firstStagingOrProd(['staging_DATABASE_URL', 'STAGING_DATABASE_URL'], 'DATABASE_URL') ??
      envFirst(['MYSQL_URL', 'MYSQL_PUBLIC_URL'])

    if (url) {
      pool = mysql.createPool(url)
    } else {
      const host =
        firstStagingOrProd(['staging_MYSQL_HOST', 'STAGING_MYSQL_HOST'], 'MYSQL_HOST') ??
        envFirst(['MYSQLHOST', 'MYSQL_HOST']) ??
        '127.0.0.1'
      const portStr =
        firstStagingOrProd(['staging_MYSQL_PORT', 'STAGING_MYSQL_PORT'], 'MYSQL_PORT') ??
        envFirst(['MYSQLPORT', 'MYSQL_PORT'])
      const port = portStr ? Number(portStr) : 3306
      const user =
        firstStagingOrProd(['staging_MYSQL_USER', 'STAGING_MYSQL_USER'], 'MYSQL_USER') ??
        envFirst(['MYSQLUSER', 'MYSQL_USER']) ??
        'root'
      const password =
        firstStagingOrProd(['staging_MYSQL_PASSWORD', 'STAGING_MYSQL_PASSWORD'], 'MYSQL_PASSWORD') ??
        envFirst(['MYSQLPASSWORD', 'MYSQL_PASSWORD']) ??
        ''
      const database =
        firstStagingOrProd(['staging_MYSQL_DATABASE', 'STAGING_MYSQL_DATABASE'], 'MYSQL_DATABASE') ??
        envFirst(['MYSQLDATABASE', 'MYSQL_DATABASE']) ??
        'retirement_calculator'
      pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
      })
    }
  }
  return pool
}

export async function ensureSchema(): Promise<void> {
  const p = getPool()
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await p.query(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      name VARCHAR(512) NOT NULL,
      inputs JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX scenarios_user_id (user_id),
      CONSTRAINT scenarios_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  try {
    await p.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL')
  } catch {
    /* already nullable or cannot alter */
  }
  try {
    await p.query('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE')
  } catch (e: unknown) {
    const errno = typeof e === 'object' && e !== null && 'errno' in e ? (e as { errno: number }).errno : 0
    if (errno !== 1060) throw e
  }
  try {
    await p.query('ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NULL')
  } catch (e: unknown) {
    const errno = typeof e === 'object' && e !== null && 'errno' in e ? (e as { errno: number }).errno : 0
    if (errno !== 1060) throw e
  }
  try {
    await p.query('ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(64) NULL')
  } catch (e: unknown) {
    const errno = typeof e === 'object' && e !== null && 'errno' in e ? (e as { errno: number }).errno : 0
    if (errno !== 1060) throw e
  }
  try {
    await p.query(
      'ALTER TABLE users ADD COLUMN onboarding_done TINYINT(1) NOT NULL DEFAULT 0',
    )
    /* First migration only: treat existing accounts as already onboarded. */
    await p.query('UPDATE users SET onboarding_done = 1')
  } catch (e: unknown) {
    const errno = typeof e === 'object' && e !== null && 'errno' in e ? (e as { errno: number }).errno : 0
    if (errno !== 1060) throw e
  }
}
