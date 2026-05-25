import { randomBytes } from 'node:crypto'
import type { Express, Request, Response } from 'express'
import { dbQuery } from './dbQuery.js'
import { exchangeTrueLayerAuthCode } from './truelayerClient.js'
import type { TrueLayerConfig } from './truelayerConfig.js'
import {
  buildTrueLayerAuthUrl,
  getTrueLayerConfig,
  isTrueLayerConfigured,
  parseTrueLayerUserRegion,
  resolveTrueLayerRedirectUri,
} from './truelayerConfig.js'
import {
  connectionSummary,
  deleteTrueLayerConnectionForUser,
  fetchAndStoreTrueLayerSnapshot,
  loadTrueLayerAccountRows,
  loadTrueLayerConnection,
  persistTrueLayerAccounts,
  saveTrueLayerTokensForUser,
} from './truelayerData.js'
import {
  subscriptionGrantsAccess,
  subscriptionStatusFromStripe,
} from './stripeBilling.js'

type SessionUser = { userId: string; email: string }

const STATE_COOKIE = 'truelayer_oauth_state'
const UID_COOKIE = 'truelayer_oauth_uid'
const REDIRECT_COOKIE = 'truelayer_oauth_redirect'
const STATE_MAX_AGE_MS = 10 * 60 * 1000

function browserOriginFromAuthRequest(req: Request): string | undefined {
  const q = req.query.origin
  if (typeof q === 'string' && q.trim()) return q.trim()
  const header = req.get('origin')?.trim()
  return header || undefined
}

function trueLayerCfgWithRedirect(cfg: TrueLayerConfig, redirectUri: string): TrueLayerConfig {
  return { ...cfg, redirectUri }
}

function oauthCookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    path: '/',
  }
}

function dashboardUrl(cfg: ReturnType<typeof getTrueLayerConfig>, query: string): string {
  const base = cfg?.clientOrigin ?? 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/${query.startsWith('?') ? query : `?${query}`}`
}

async function userSubscriptionGrantsAccess(userId: string): Promise<boolean> {
  const { rows } = await dbQuery<{ subscription_status: string | null }>(
    'SELECT subscription_status FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  return subscriptionGrantsAccess(subscriptionStatusFromStripe(rows[0]?.subscription_status))
}

async function requirePaidTrueLayerUser(
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

const TRUELAYER_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Bank connection was cancelled.',
  invalid_state: 'Bank connection expired. Please try again.',
  oauth_token: 'We could not complete the bank connection. Please try again.',
  account_fetch_failed: 'Your bank is connected, but balances could not be loaded yet. Try syncing again.',
  truelayer_not_configured: 'Bank connection is not available right now.',
}

function redirectWithError(cfg: NonNullable<ReturnType<typeof getTrueLayerConfig>>, code: string) {
  const message = TRUELAYER_ERROR_MESSAGES[code] ?? 'Something went wrong connecting your bank.'
  return `${cfg.clientOrigin}/?truelayer_error=${encodeURIComponent(code)}&truelayer_message=${encodeURIComponent(message)}`
}

export function installTrueLayerRoutes(
  app: Express,
  readSessionUser: (req: Request) => Promise<SessionUser | null>,
): void {
  app.get('/api/truelayer/setup', (req, res) => {
    const cfg = getTrueLayerConfig()
    if (!cfg) {
      res.json({ ok: true, configured: false, redirectUri: null })
      return
    }
    const redirectUri = resolveTrueLayerRedirectUri(browserOriginFromAuthRequest(req))
    res.json({
      ok: true,
      configured: true,
      sandbox: process.env.TRUELAYER_ENV?.trim().toLowerCase() === 'sandbox',
      redirectUri,
      hint: `Add this exact URI in TrueLayer Console → Redirect URIs (sandbox): ${redirectUri}`,
    })
  })

  app.get('/api/truelayer/status', async (req, res) => {
    const configured = isTrueLayerConfigured()
    const u = await readSessionUser(req)
    const subscribed = u ? await userSubscriptionGrantsAccess(u.userId) : false
    const available = configured && subscribed
    if (!u || !available) {
      res.json({
        ok: true,
        configured,
        available: false,
        connected: false,
        institutionName: null as string | null,
      })
      return
    }
    const connection = await loadTrueLayerConnection(u.userId)
    res.json({
      ok: true,
      configured: true,
      available: true,
      connected: Boolean(connection),
      institutionName: connection?.institution_name?.trim() || null,
    })
  })

  app.get('/api/truelayer/auth', async (req, res) => {
    const cfg = getTrueLayerConfig()
    if (!cfg) {
      res.status(503).json({ ok: false, error: 'truelayer_not_configured' })
      return
    }
    const u = await requirePaidTrueLayerUser(req, res, readSessionUser)
    if (!u) return

    const region = parseTrueLayerUserRegion(req.query.region)
    const redirectUri = resolveTrueLayerRedirectUri(browserOriginFromAuthRequest(req))
    const authCfg = trueLayerCfgWithRedirect(cfg, redirectUri)
    const state = randomBytes(32).toString('hex')
    res.cookie(STATE_COOKIE, state, oauthCookieOpts(STATE_MAX_AGE_MS))
    res.cookie(UID_COOKIE, u.userId, oauthCookieOpts(STATE_MAX_AGE_MS))
    res.cookie(REDIRECT_COOKIE, redirectUri, oauthCookieOpts(STATE_MAX_AGE_MS))
    res.redirect(302, buildTrueLayerAuthUrl(authCfg, state, region, u.email))
  })

  app.get('/api/truelayer/callback', async (req, res) => {
    const cfg = getTrueLayerConfig()
    if (!cfg) {
      res.status(503).send('TrueLayer is not configured.')
      return
    }

    const clearOauthCookies = () => {
      res.clearCookie(STATE_COOKIE, { path: '/', sameSite: 'lax' })
      res.clearCookie(UID_COOKIE, { path: '/', sameSite: 'lax' })
      res.clearCookie(REDIRECT_COOKIE, { path: '/', sameSite: 'lax' })
    }

    const oauthErr = typeof req.query.error === 'string' ? req.query.error : ''
    if (oauthErr) {
      clearOauthCookies()
      const code = oauthErr === 'access_denied' ? 'access_denied' : 'oauth_denied'
      res.redirect(302, redirectWithError(cfg, code))
      return
    }

    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const cookieState = req.cookies?.[STATE_COOKIE]
    const cookieUid = req.cookies?.[UID_COOKIE]
    clearOauthCookies()

    if (!code || !state || !cookieState || state !== cookieState || !cookieUid) {
      res.redirect(302, redirectWithError(cfg, 'invalid_state'))
      return
    }

    const cookieRedirect =
      typeof req.cookies?.[REDIRECT_COOKIE] === 'string' ? req.cookies[REDIRECT_COOKIE].trim() : ''
    const exchangeCfg = cookieRedirect ? trueLayerCfgWithRedirect(cfg, cookieRedirect) : cfg
    const exchanged = await exchangeTrueLayerAuthCode(code, exchangeCfg)
    if (!exchanged.ok) {
      console.error('[truelayer] token exchange failed:', exchanged.error)
      res.redirect(302, redirectWithError(cfg, 'oauth_token'))
      return
    }

    const userId = String(cookieUid)
    const connectionId = await saveTrueLayerTokensForUser(userId, exchanged.tokens, {
      institutionName: 'Connected bank',
    })

    let fetchFailed = false
    try {
      await persistTrueLayerAccounts(userId, connectionId, exchanged.tokens.accessToken)
    } catch (err) {
      fetchFailed = true
      console.error('[truelayer] account fetch after connect failed:', err)
    }

    const q = fetchFailed
      ? 'truelayer=connected&truelayer_fetch_pending=1'
      : 'truelayer=connected'
    res.redirect(302, `${cfg.clientOrigin}/?${q}`)
  })

  app.get('/api/truelayer/accounts', async (req, res) => {
    if (!isTrueLayerConfigured()) {
      res.status(503).json({ ok: false, error: 'truelayer_not_configured' })
      return
    }
    const u = await requirePaidTrueLayerUser(req, res, readSessionUser)
    if (!u) return

    const connection = await loadTrueLayerConnection(u.userId)
    if (!connection) {
      res.json({ ok: true, connected: false, connection: null, accounts: [], snapshot: null })
      return
    }

    const { snapshot, fetchFailed } = await fetchAndStoreTrueLayerSnapshot(u.userId)
    const accountRows = await loadTrueLayerAccountRows(u.userId)
    const accounts = accountRows.map((row) => ({
      id: row.id,
      displayName: row.display_name?.trim() || 'Account',
      accountType: row.account_type,
      currency: row.currency,
      currentBalance: Number(row.current_balance ?? 0),
      availableBalance: Number(row.available_balance ?? 0),
      providerId: row.provider_id,
    }))

    res.json({
      ok: true,
      connected: true,
      connection: connectionSummary(connection),
      accounts,
      snapshot,
      fetchFailed,
      ...(fetchFailed ? { warning: TRUELAYER_ERROR_MESSAGES.account_fetch_failed } : {}),
    })
  })

  app.post('/api/truelayer/disconnect', async (req, res) => {
    if (!isTrueLayerConfigured()) {
      res.status(503).json({ ok: false, error: 'truelayer_not_configured' })
      return
    }
    const u = await requirePaidTrueLayerUser(req, res, readSessionUser)
    if (!u) return
    await deleteTrueLayerConnectionForUser(u.userId)
    res.json({ ok: true })
  })
}
