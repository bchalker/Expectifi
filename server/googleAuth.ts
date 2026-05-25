import type { Express, Request, Response } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import {
  COOKIE_NAME,
  GOOGLE_CHECKOUT_COOKIE,
  createGoogleCheckoutToken,
  createToken,
} from './authToken.js'
import { dbQuery, isUniqueViolation } from './dbQuery.js'
import {
  getStripeBackend,
  getStripeKeyMode,
  getStripeSubscriptionPriceId,
} from './stripeBackend.js'

function googleSignupRequiresStripePayment(stripeCustomerId: string | null): boolean {
  const stripe = getStripeBackend()
  if (!stripe || !getStripeSubscriptionPriceId()) return false
  return !stripeCustomerId
}
import { isPlaidConfigured } from './plaidClient.js'
import { isTrueLayerConfigured } from './truelayerConfig.js'

const STATE_COOKIE = 'google_oauth_state'
const STATE_MAX_AGE_MS = 10 * 60 * 1000
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const CHECKOUT_MAX_AGE_MS = 30 * 60 * 1000

function authCookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    path: '/',
  }
}

async function setSessionOrGoogleCheckoutCookie(
  res: Response,
  clientOrigin: string,
  userId: string,
  email: string,
  stripeCustomerId: string | null,
): Promise<void> {
  if (googleSignupRequiresStripePayment(stripeCustomerId)) {
    res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax' })
    const checkoutTok = await createGoogleCheckoutToken(userId, email)
    res.cookie(GOOGLE_CHECKOUT_COOKIE, checkoutTok, authCookieOpts(CHECKOUT_MAX_AGE_MS))
    res.redirect(302, `${clientOrigin}/?google_checkout=1`)
    return
  }
  const token = await createToken(userId, email)
  res.cookie(COOKIE_NAME, token, authCookieOpts(SESSION_MAX_AGE_MS))
  res.redirect(302, `${clientOrigin}/`)
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function googleConfig(port: number) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  const apiPublic = process.env.API_PUBLIC_URL?.trim() || `http://localhost:${port}`
  const redirectUri = `${apiPublic.replace(/\/$/, '')}/api/auth/google/callback`
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri, clientOrigin }
}

type GoogleTokenResponse = {
  access_token?: string
  error?: string
  error_description?: string
}

type GoogleUserInfo = {
  sub: string
  email?: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
  name?: string
}

function displayNameFromGoogle(info: GoogleUserInfo): string | null {
  const g = typeof info.given_name === 'string' ? info.given_name.trim() : ''
  const f = typeof info.family_name === 'string' ? info.family_name.trim() : ''
  const combined = [g, f].filter(Boolean).join(' ').trim()
  if (combined) return combined
  const n = typeof info.name === 'string' ? info.name.trim() : ''
  return n || null
}

async function upsertGoogleDisplayName(userId: string, info: GoogleUserInfo): Promise<void> {
  const dn = displayNameFromGoogle(info)
  if (!dn) return
  await dbQuery('UPDATE users SET display_name = ? WHERE id = ?', [dn, userId])
}

async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string } | { error: string }> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await r.json()) as GoogleTokenResponse
  if (!r.ok || data.error || !data.access_token) {
    const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
    return { error: msg }
  }
  return { accessToken: data.access_token }
}

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) return null
  return (await r.json()) as GoogleUserInfo
}

export function installGoogleAuth(app: Express, port: number): void {
  app.get('/api/auth/config', (_req: Request, res: Response) => {
    const cfg = googleConfig(port)
    const stripe = getStripeBackend()
    res.json({
      ok: true,
      googleOAuth: Boolean(cfg),
      stripeConfigured: Boolean(stripe),
      stripeMode: getStripeKeyMode(),
      subscriptionBillingEnabled: Boolean(stripe && getStripeSubscriptionPriceId()),
      plaidConfigured: isPlaidConfigured(),
      truelayerConfigured: isTrueLayerConfigured(),
    })
  })

  app.get('/api/auth/google', (_req: Request, res: Response) => {
    const cfg = googleConfig(port)
    if (!cfg) {
      res.status(503).json({ ok: false, error: 'google_oauth_not_configured' })
      return
    }
    const state = randomBytes(32).toString('hex')
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_MAX_AGE_MS,
      path: '/',
    })
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    u.searchParams.set('client_id', cfg.clientId)
    u.searchParams.set('redirect_uri', cfg.redirectUri)
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'openid email profile')
    u.searchParams.set('state', state)
    u.searchParams.set('access_type', 'offline')
    u.searchParams.set('prompt', 'select_account')
    res.redirect(302, u.toString())
  })

  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    const cfg = googleConfig(port)
    if (!cfg) {
      res.status(503).send('Google OAuth is not configured.')
      return
    }
    const err = typeof req.query.error === 'string' ? req.query.error : ''
    if (err) {
      res.clearCookie(STATE_COOKIE, { path: '/' })
      res.redirect(302, `${cfg.clientOrigin}/?auth_error=${encodeURIComponent(err)}`)
      return
    }
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const cookieState = req.cookies?.[STATE_COOKIE]
    res.clearCookie(STATE_COOKIE, { path: '/', sameSite: 'lax' })
    if (!code || !state || !cookieState || state !== cookieState) {
      res.redirect(302, `${cfg.clientOrigin}/?auth_error=invalid_state`)
      return
    }

    const exchanged = await exchangeCode(code, cfg.clientId, cfg.clientSecret, cfg.redirectUri)
    if ('error' in exchanged) {
      res.redirect(302, `${cfg.clientOrigin}/?auth_error=oauth_token`)
      return
    }
    const info = await fetchUserInfo(exchanged.accessToken)
    if (!info?.sub || !info.email || !info.email_verified) {
      res.redirect(302, `${cfg.clientOrigin}/?auth_error=unverified_email`)
      return
    }
    const email = normalizeEmail(info.email)
    const googleSub = info.sub

    try {
      const { rows: bySub } = await dbQuery<{
        id: string
        email: string
        google_sub: string | null
        stripe_customer_id: string | null
      }>('SELECT id, email, google_sub, stripe_customer_id FROM users WHERE google_sub = ? LIMIT 1', [googleSub])
      const rowSub = bySub[0]
      if (rowSub) {
        await upsertGoogleDisplayName(rowSub.id, info)
        await setSessionOrGoogleCheckoutCookie(
          res,
          cfg.clientOrigin,
          rowSub.id,
          normalizeEmail(rowSub.email),
          rowSub.stripe_customer_id,
        )
        return
      }

      const { rows: byEmail } = await dbQuery<{
        id: string
        email: string
        password_hash: string | null
        google_sub: string | null
        stripe_customer_id: string | null
      }>(
        'SELECT id, email, password_hash, google_sub, stripe_customer_id FROM users WHERE email = ? LIMIT 1',
        [email],
      )
      const rowEmail = byEmail[0]

      if (rowEmail) {
        if (rowEmail.google_sub && rowEmail.google_sub !== googleSub) {
          res.redirect(302, `${cfg.clientOrigin}/?auth_error=account_conflict`)
          return
        }
        if (!rowEmail.google_sub) {
          await dbQuery(
            'UPDATE users SET google_sub = ?, display_name = COALESCE(?, display_name) WHERE id = ?',
            [googleSub, displayNameFromGoogle(info), rowEmail.id],
          )
        } else {
          await upsertGoogleDisplayName(rowEmail.id, info)
        }
        await setSessionOrGoogleCheckoutCookie(
          res,
          cfg.clientOrigin,
          rowEmail.id,
          email,
          rowEmail.stripe_customer_id,
        )
        return
      }

      const id = randomUUID()
      try {
        await dbQuery(
          'INSERT INTO users (id, email, password_hash, google_sub, display_name, onboarding_done) VALUES (?, ?, NULL, ?, ?, FALSE)',
          [id, email, googleSub, displayNameFromGoogle(info)],
        )
      } catch (e: unknown) {
        if (isUniqueViolation(e)) {
          res.redirect(302, `${cfg.clientOrigin}/?auth_error=email_in_use`)
          return
        }
        throw e
      }
      await setSessionOrGoogleCheckoutCookie(res, cfg.clientOrigin, id, email, null)
    } catch {
      res.redirect(302, `${cfg.clientOrigin}/?auth_error=server`)
    }
  })
}
