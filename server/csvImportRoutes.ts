import type { Express, Request, Response } from 'express'
import { dbQuery } from './dbQuery.js'
import { parseStoredCsvImportPayload } from './csvImportModel.js'
import {
  subscriptionGrantsAccess,
  subscriptionStatusFromStripe,
} from './stripeBilling.js'

type SessionUser = { userId: string; email: string }

async function userSubscriptionGrantsAccess(userId: string): Promise<boolean> {
  const { rows } = await dbQuery<{ subscription_status: string | null }>(
    'SELECT subscription_status FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  return subscriptionGrantsAccess(subscriptionStatusFromStripe(rows[0]?.subscription_status))
}

async function requirePaidCsvUser(
  req: Request,
  res: Response,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): Promise<SessionUser | null> {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return null
  }
  if (!(await userSubscriptionGrantsAccess(u.userId))) {
    res.status(403).json({ ok: false, error: 'subscription_required' })
    return null
  }
  return u
}

type ImportRow = {
  payload: unknown
  updated_at: string | Date
}

export function installCsvImportRoutes(
  app: Express,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): void {
  app.get('/api/user/csv-import', async (req, res) => {
    const u = await requirePaidCsvUser(req, res, readSessionUser)
    if (!u) return
    const { rows } = await dbQuery<ImportRow>(
      'SELECT payload, updated_at FROM user_portfolio_imports WHERE user_id = ? LIMIT 1',
      [u.userId],
    )
    const row = rows[0]
    if (!row) {
      res.json({ ok: true, import: null })
      return
    }
    const parsed = parseStoredCsvImportPayload(row.payload)
    res.json({
      ok: true,
      import: parsed,
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    })
  })

  app.put('/api/user/csv-import', async (req, res) => {
    const u = await requirePaidCsvUser(req, res, readSessionUser)
    if (!u) return
    const parsed = parseStoredCsvImportPayload(req.body)
    if (!parsed) {
      res.status(400).json({ ok: false, error: 'invalid_import' })
      return
    }
    await dbQuery(
      `INSERT INTO user_portfolio_imports (user_id, payload, updated_at)
       VALUES (?, ?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         updated_at = NOW()`,
      [u.userId, JSON.stringify(parsed)],
    )
    res.json({ ok: true })
  })

  app.delete('/api/user/csv-import', async (req, res) => {
    const u = await requirePaidCsvUser(req, res, readSessionUser)
    if (!u) return
    await dbQuery('DELETE FROM user_portfolio_imports WHERE user_id = ?', [u.userId])
    res.json({ ok: true })
  })
}
