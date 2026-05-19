import type { Express, Request, Response } from 'express'
import { CountryCode, Products } from 'plaid'
import { dbQuery } from './dbQuery.js'
import { getPlaidClient, isPlaidConfigured } from './plaidClient.js'
import { decryptPlaidAccessToken, encryptPlaidAccessToken } from './plaidCrypto.js'
import { buildPlaidHoldingsSnapshot, type PlaidHoldingsSnapshot } from './plaidHoldings.js'

type SessionUser = { userId: string; email: string }

type PlaidItemRow = {
  id: string
  user_id: string
  access_token_enc: string
  institution_id: string | null
  institution_name: string | null
}

async function fetchSnapshotForItem(
  item: PlaidItemRow,
  institutionNameFallback: string,
): Promise<PlaidHoldingsSnapshot> {
  const accessToken = decryptPlaidAccessToken(item.access_token_enc)
  const plaid = getPlaidClient()
  const { data } = await plaid.investmentsHoldingsGet({ access_token: accessToken })
  return buildPlaidHoldingsSnapshot({
    itemId: item.id,
    institutionName: item.institution_name?.trim() || institutionNameFallback,
    accounts: data.accounts,
    holdings: data.holdings,
    securities: data.securities,
  })
}

async function mergeSnapshots(snapshots: PlaidHoldingsSnapshot[]): Promise<PlaidHoldingsSnapshot> {
  const rows = snapshots.flatMap((s) => s.rows)
  const totals = { base401k: 0, baseSE401k: 0, baseRoth: 0, baseHsa: 0, brkBal: 0 }
  for (const s of snapshots) {
    totals.base401k += s.balances.base401k
    totals.baseSE401k += s.balances.baseSE401k
    totals.baseRoth += s.balances.baseRoth
    totals.baseHsa += s.balances.baseHsa
    totals.brkBal += s.balances.brkBal
  }
  return {
    itemId: snapshots.map((s) => s.itemId).join(','),
    institutionName: snapshots.map((s) => s.institutionName).join(', '),
    rows,
    balances: {
      base401k: Math.round(totals.base401k),
      baseSE401k: Math.round(totals.baseSE401k),
      baseRoth: Math.round(totals.baseRoth),
      baseHsa: Math.round(totals.baseHsa),
      brkBal: Math.round(totals.brkBal),
    },
  }
}

export function installPlaidRoutes(
  app: Express,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): void {
  app.get('/api/plaid/status', async (req, res) => {
    const configured = isPlaidConfigured()
    const u = await readSessionUser(req)
    if (!u) {
      res.json({ ok: true, configured, connected: false, institutions: [] as string[] })
      return
    }
    if (!configured) {
      res.json({ ok: true, configured: false, connected: false, institutions: [] as string[] })
      return
    }
    const { rows } = await dbQuery<{ institution_name: string | null }>(
      'SELECT institution_name FROM plaid_items WHERE user_id = ? ORDER BY created_at ASC',
      [u.userId],
    )
    const institutions = rows
      .map((r) => r.institution_name?.trim())
      .filter((name): name is string => Boolean(name))
    res.json({ ok: true, configured: true, connected: institutions.length > 0, institutions })
  })

  app.post('/api/plaid/link-token', async (req, res) => {
    if (!isPlaidConfigured()) {
      res.status(503).json({ ok: false, error: 'plaid_not_configured' })
      return
    }
    const u = await readSessionUser(req)
    if (!u) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }
    try {
      const plaid = getPlaidClient()
      const { data } = await plaid.linkTokenCreate({
        user: { client_user_id: u.userId },
        client_name: 'HeadwayPlanner',
        products: [Products.Investments],
        country_codes: [CountryCode.Us],
        language: 'en',
      })
      res.json({ ok: true, linkToken: data.link_token, expiration: data.expiration })
    } catch {
      res.status(502).json({ ok: false, error: 'plaid_link_token_failed' })
    }
  })

  app.post('/api/plaid/exchange-token', async (req, res) => {
    if (!isPlaidConfigured()) {
      res.status(503).json({ ok: false, error: 'plaid_not_configured' })
      return
    }
    const u = await readSessionUser(req)
    if (!u) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }
    const publicToken = typeof req.body?.publicToken === 'string' ? req.body.publicToken.trim() : ''
    const institutionId =
      typeof req.body?.institutionId === 'string' ? req.body.institutionId.trim() : null
    const institutionName =
      typeof req.body?.institutionName === 'string' ? req.body.institutionName.trim() : 'Financial institution'
    if (!publicToken) {
      res.status(400).json({ ok: false, error: 'invalid_request' })
      return
    }

    try {
      const plaid = getPlaidClient()
      const { data: exchange } = await plaid.itemPublicTokenExchange({ public_token: publicToken })
      const itemId = exchange.item_id
      const accessToken = exchange.access_token
      const enc = encryptPlaidAccessToken(accessToken)

      await dbQuery(
        `INSERT INTO plaid_items (id, user_id, access_token_enc, institution_id, institution_name, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON CONFLICT (id) DO UPDATE SET
           access_token_enc = EXCLUDED.access_token_enc,
           institution_id = EXCLUDED.institution_id,
           institution_name = EXCLUDED.institution_name,
           updated_at = NOW()`,
        [itemId, u.userId, enc, institutionId, institutionName],
      )

      const item: PlaidItemRow = {
        id: itemId,
        user_id: u.userId,
        access_token_enc: enc,
        institution_id: institutionId,
        institution_name: institutionName,
      }
      const snapshot = await fetchSnapshotForItem(item, institutionName)
      res.json({ ok: true, snapshot })
    } catch {
      res.status(502).json({ ok: false, error: 'plaid_exchange_failed' })
    }
  })

  app.post('/api/plaid/sync', async (req, res) => {
    if (!isPlaidConfigured()) {
      res.status(503).json({ ok: false, error: 'plaid_not_configured' })
      return
    }
    const u = await readSessionUser(req)
    if (!u) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }
    const { rows } = await dbQuery<PlaidItemRow>(
      'SELECT id, user_id, access_token_enc, institution_id, institution_name FROM plaid_items WHERE user_id = ? ORDER BY created_at ASC',
      [u.userId],
    )
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: 'no_plaid_items' })
      return
    }
    try {
      const snapshots: PlaidHoldingsSnapshot[] = []
      for (const item of rows) {
        snapshots.push(await fetchSnapshotForItem(item, item.institution_name?.trim() || 'Financial institution'))
      }
      const merged = await mergeSnapshots(snapshots)
      res.json({ ok: true, snapshot: merged, itemSnapshots: snapshots })
    } catch {
      res.status(502).json({ ok: false, error: 'plaid_sync_failed' })
    }
  })

  app.delete('/api/plaid/items/:itemId', async (req, res) => {
    const u = await readSessionUser(req)
    if (!u) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }
    const itemId = typeof req.params.itemId === 'string' ? req.params.itemId.trim() : ''
    if (!itemId) {
      res.status(400).json({ ok: false, error: 'invalid_request' })
      return
    }
    const { rows } = await dbQuery<PlaidItemRow>(
      'SELECT id, user_id, access_token_enc, institution_id, institution_name FROM plaid_items WHERE id = ? AND user_id = ? LIMIT 1',
      [itemId, u.userId],
    )
    const item = rows[0]
    if (!item) {
      res.status(404).json({ ok: false, error: 'not_found' })
      return
    }
    try {
      if (isPlaidConfigured()) {
        const accessToken = decryptPlaidAccessToken(item.access_token_enc)
        const plaid = getPlaidClient()
        await plaid.itemRemove({ access_token: accessToken })
      }
    } catch {
      /* still delete locally if Plaid revoke fails */
    }
    await dbQuery('DELETE FROM plaid_items WHERE id = ? AND user_id = ?', [itemId, u.userId])
    res.json({ ok: true })
  })
}

export function logPlaidConfigAtStartup(): void {
  if (isPlaidConfigured()) {
    console.log('[plaid] configured')
  } else {
    console.log('[plaid] not configured (set PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV)')
  }
}
