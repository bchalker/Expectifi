import type { QueryResultRow } from 'pg'
import { getPool } from './db.js'

/** Convert `?` placeholders to PostgreSQL `$1`, `$2`, … */
export function toPgSql(sql: string): (params: unknown[]) => { text: string; values: unknown[] } {
  let n = 0
  const text = sql.replace(/\?/g, () => `$${++n}`)
  return (values) => ({ text, values })
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool()
  const { text, values } = toPgSql(sql)(params)
  const result = await pool.query<T>(text, values)
  return { rows: result.rows, rowCount: result.rowCount ?? 0 }
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505'
}

export function isDuplicateColumn(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '42701'
}
