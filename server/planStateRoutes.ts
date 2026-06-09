import type { Express, Request, Response } from 'express'
import { dbQuery } from './dbQuery.js'
import { parseUserPlanStatePayload } from './planStateModel.js'

type SessionUser = { userId: string; email: string }

type PlanStateRow = {
  payload: unknown
  updated_at: string | Date
}

async function requireAuthenticatedUser(
  req: Request,
  res: Response,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): Promise<SessionUser | null> {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return null
  }
  return u
}

export function installPlanStateRoutes(
  app: Express,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): void {
  app.get('/api/user/plan-state', async (req, res) => {
    const u = await requireAuthenticatedUser(req, res, readSessionUser)
    if (!u) return
    const { rows } = await dbQuery<PlanStateRow>(
      'SELECT payload, updated_at FROM user_plan_state WHERE user_id = ? LIMIT 1',
      [u.userId],
    )
    const row = rows[0]
    if (!row) {
      res.json({ ok: true, planState: null })
      return
    }
    const parsed = parseUserPlanStatePayload(row.payload)
    res.json({
      ok: true,
      planState: parsed,
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    })
  })

  app.put('/api/user/plan-state', async (req, res) => {
    const u = await requireAuthenticatedUser(req, res, readSessionUser)
    if (!u) return
    const parsed = parseUserPlanStatePayload(req.body)
    if (!parsed) {
      res.status(400).json({ ok: false, error: 'invalid_plan_state' })
      return
    }
    await dbQuery(
      `INSERT INTO user_plan_state (user_id, payload, updated_at)
       VALUES (?, ?, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         payload = EXCLUDED.payload,
         updated_at = NOW()`,
      [u.userId, JSON.stringify(parsed)],
    )
    res.json({ ok: true })
  })

  app.delete('/api/user/plan-state', async (req, res) => {
    const u = await requireAuthenticatedUser(req, res, readSessionUser)
    if (!u) return
    await dbQuery('DELETE FROM user_plan_state WHERE user_id = ?', [u.userId])
    res.json({ ok: true })
  })
}
