import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL?.trim()
    if (url) {
      pool = mysql.createPool(url)
    } else {
      pool = mysql.createPool({
        host: process.env.MYSQL_HOST ?? '127.0.0.1',
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER ?? 'root',
        password: process.env.MYSQL_PASSWORD ?? '',
        database: process.env.MYSQL_DATABASE ?? 'retirement_calculator',
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
}
