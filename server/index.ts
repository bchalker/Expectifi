import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COOKIE_NAME, GOOGLE_CHECKOUT_COOKIE, createToken, verifyGoogleCheckoutToken, verifyToken } from './authToken.js'
import { ensureSchema } from './db.js'
import { dbQuery, isUniqueViolation } from './dbQuery.js'
import { getStripeBackend } from './stripeBackend.js'
import { installGoogleAuth } from './googleAuth.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
installGoogleAuth(app, PORT)

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

async function readSessionUser(
  req: express.Request,
): Promise<{ userId: string; email: string } | null> {
  const raw = req.cookies?.[COOKIE_NAME]
  if (!raw || typeof raw !== 'string') return null
  return verifyToken(raw)
}

function onboardingDoneFromRow(v: unknown): boolean {
  if (v === true || v === 1) return true
  if (v === false || v === 0) return false
  const n = Number(v)
  return n === 1
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'retirement-calculator-api' })
})

app.get('/api/auth/me', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  const { rows } = await dbQuery<{ display_name: string | null; onboarding_done: boolean }>(
    'SELECT display_name, onboarding_done FROM users WHERE id = ? LIMIT 1',
    [u.userId],
  )
  const row = rows[0]
  res.json({
    ok: true,
    user: {
      id: u.userId,
      email: u.email,
      displayName: row?.display_name ?? null,
      onboardingDone: onboardingDoneFromRow(row?.onboarding_done),
    },
  })
})

app.post('/api/stripe/signup-setup-intent', async (_req, res) => {
  const stripe = getStripeBackend()
  if (!stripe) {
    res.status(503).json({ ok: false, error: 'stripe_not_configured' })
    return
  }
  try {
    const intent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session',
    })
    const clientSecret = intent.client_secret
    if (!clientSecret) {
      res.status(500).json({ ok: false, error: 'stripe_setup_failed' })
      return
    }
    res.json({ ok: true, clientSecret })
  } catch {
    res.status(500).json({ ok: false, error: 'stripe_setup_failed' })
  }
})

app.get('/api/auth/google/checkout-session', async (req, res) => {
  const raw = req.cookies?.[GOOGLE_CHECKOUT_COOKIE]
  if (!raw || typeof raw !== 'string') {
    res.status(401).json({ ok: false, error: 'no_pending_checkout' })
    return
  }
  const claims = await verifyGoogleCheckoutToken(raw)
  if (!claims) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    res.status(401).json({ ok: false, error: 'invalid_checkout' })
    return
  }
  const { rows } = await dbQuery<{
    id: string
    email: string
    display_name: string | null
    google_sub: string | null
    stripe_customer_id: string | null
    onboarding_done: boolean
  }>(
    'SELECT id, email, display_name, google_sub, stripe_customer_id, onboarding_done FROM users WHERE id = ? LIMIT 1',
    [claims.userId],
  )
  const row = rows[0]
  if (!row?.google_sub) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    res.status(401).json({ ok: false, error: 'invalid_user' })
    return
  }
  const emailNorm = normalizeEmail(row.email)
  const stripe = getStripeBackend()
  const needsPayment = Boolean(stripe) && !row.stripe_customer_id
  if (!needsPayment) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    const token = await createToken(row.id, emailNorm)
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.json({
      ok: true,
      status: 'session_ready',
      user: {
        id: row.id,
        email: emailNorm,
        displayName: row.display_name,
        onboardingDone: onboardingDoneFromRow(row.onboarding_done),
      },
    })
    return
  }
  res.json({
    ok: true,
    status: 'payment_required',
    email: emailNorm,
    displayName: row.display_name,
    onboardingDone: onboardingDoneFromRow(row.onboarding_done),
  })
})

app.post('/api/auth/google/complete-signup', async (req, res) => {
  const raw = req.cookies?.[GOOGLE_CHECKOUT_COOKIE]
  if (!raw || typeof raw !== 'string') {
    res.status(401).json({ ok: false, error: 'no_pending_checkout' })
    return
  }
  const claims = await verifyGoogleCheckoutToken(raw)
  if (!claims) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    res.status(401).json({ ok: false, error: 'invalid_checkout' })
    return
  }
  const paymentMethodId =
    typeof req.body?.paymentMethodId === 'string' ? req.body.paymentMethodId.trim() : ''
  if (!paymentMethodId) {
    res.status(400).json({ ok: false, error: 'payment_method_required' })
    return
  }
  const stripe = getStripeBackend()
  if (!stripe) {
    res.status(503).json({ ok: false, error: 'stripe_not_configured' })
    return
  }
  const { rows } = await dbQuery<{
    id: string
    email: string
    display_name: string | null
    google_sub: string | null
    stripe_customer_id: string | null
    onboarding_done: boolean
  }>(
    'SELECT id, email, display_name, google_sub, stripe_customer_id, onboarding_done FROM users WHERE id = ? LIMIT 1',
    [claims.userId],
  )
  const row = rows[0]
  if (!row?.google_sub) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    res.status(401).json({ ok: false, error: 'invalid_user' })
    return
  }
  const emailNorm = normalizeEmail(row.email)
  if (row.stripe_customer_id) {
    res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
    const token = await createToken(row.id, emailNorm)
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.json({
      ok: true,
      user: {
        id: row.id,
        email: emailNorm,
        displayName: row.display_name,
        onboardingDone: onboardingDoneFromRow(row.onboarding_done),
      },
    })
    return
  }
  try {
    const customer = await stripe.customers.create({
      email: emailNorm,
      metadata: { app_user_id: row.id },
    })
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })
    await dbQuery('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, row.id])
  } catch {
    res.status(400).json({ ok: false, error: 'payment_failed' })
    return
  }
  res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
  const token = await createToken(row.id, emailNorm)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({
    ok: true,
    user: {
      id: row.id,
      email: emailNorm,
      displayName: row.display_name,
      onboardingDone: onboardingDoneFromRow(row.onboarding_done),
    },
  })
})

app.post('/api/auth/register', async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const paymentMethodIdRaw =
    typeof req.body?.paymentMethodId === 'string' ? req.body.paymentMethodId.trim() : ''
  const email = normalizeEmail(emailRaw)
  if (!email.includes('@') || email.length > 254) {
    res.status(400).json({ ok: false, error: 'invalid_email' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ ok: false, error: 'password_too_short' })
    return
  }

  const stripe = getStripeBackend()
  if (stripe && !paymentMethodIdRaw) {
    res.status(400).json({ ok: false, error: 'payment_method_required' })
    return
  }

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  try {
    await dbQuery('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [id, email, passwordHash])
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
      res.status(409).json({ ok: false, error: 'email_in_use' })
      return
    }
    throw e
  }

  if (stripe) {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: { app_user_id: id },
      })
      await stripe.paymentMethods.attach(paymentMethodIdRaw, { customer: customer.id })
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodIdRaw },
      })
      await dbQuery('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, id])
    } catch {
      await dbQuery('DELETE FROM users WHERE id = ?', [id])
      res.status(400).json({ ok: false, error: 'payment_failed' })
      return
    }
  }

  const token = await createToken(id, email)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({ ok: true, user: { id, email, displayName: null, onboardingDone: false } })
})

app.post('/api/auth/login', async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const email = normalizeEmail(emailRaw)
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'invalid_request' })
    return
  }
  const { rows } = await dbQuery<{
    id: string
    password_hash: string | null
    display_name: string | null
    onboarding_done: boolean
  }>('SELECT id, password_hash, display_name, onboarding_done FROM users WHERE email = ? LIMIT 1', [email])
  const row = rows[0]
  if (!row) {
    res.status(401).json({ ok: false, error: 'invalid_credentials' })
    return
  }
  if (!row.password_hash) {
    res.status(401).json({ ok: false, error: 'invalid_credentials' })
    return
  }
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) {
    res.status(401).json({ ok: false, error: 'invalid_credentials' })
    return
  }
  const token = await createToken(row.id, email)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({
    ok: true,
    user: {
      id: row.id,
      email,
      displayName: row.display_name,
      onboardingDone: onboardingDoneFromRow(row.onboarding_done),
    },
  })
})

app.post('/api/user/onboarding-complete', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  await dbQuery('UPDATE users SET onboarding_done = TRUE WHERE id = ?', [u.userId])
  const { rows } = await dbQuery<{ display_name: string | null }>(
    'SELECT display_name FROM users WHERE id = ? LIMIT 1',
    [u.userId],
  )
  const row = rows[0]
  res.json({
    ok: true,
    user: {
      id: u.userId,
      email: u.email,
      displayName: row?.display_name ?? null,
      onboardingDone: true,
    },
  })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax' })
  res.clearCookie(GOOGLE_CHECKOUT_COOKIE, { path: '/', sameSite: 'lax' })
  res.json({ ok: true })
})

app.get('/api/scenarios', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  const { rows } = await dbQuery<{
    id: string
    user_id: string
    name: string
    inputs: unknown
    created_at: Date | string
  }>(
    'SELECT id, user_id, name, inputs, created_at FROM scenarios WHERE user_id = ? ORDER BY created_at DESC',
    [u.userId],
  )
  const list = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    inputs: r.inputs,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
  }))
  res.json({ ok: true, scenarios: list })
})

app.post('/api/scenarios', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const inputs = req.body?.inputs
  if (!name || typeof inputs !== 'object' || inputs === null) {
    res.status(400).json({ ok: false, error: 'invalid_request' })
    return
  }
  const id = randomUUID()
  await dbQuery('INSERT INTO scenarios (id, user_id, name, inputs) VALUES (?, ?, ?, ?)', [
    id,
    u.userId,
    name,
    inputs,
  ])
  res.json({ ok: true, id })
})

app.delete('/api/scenarios/:id', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  const id = String(req.params.id ?? '').trim()
  if (!id) {
    res.status(400).json({ ok: false, error: 'invalid_request' })
    return
  }
  const { rowCount } = await dbQuery('DELETE FROM scenarios WHERE id = ? AND user_id = ?', [id, u.userId])
  if (rowCount === 0) {
    res.status(404).json({ ok: false, error: 'not_found' })
    return
  }
  res.json({ ok: true })
})

/** Delayed live quote (Yahoo chart) for dashboard holdings — CORS-safe via this server. */
app.get('/api/quote/:symbol', async (req, res) => {
  const raw = String(req.params.symbol ?? '').trim()
  if (!raw || raw.length > 16) {
    res.status(400).json({ ok: false, error: 'bad_symbol' })
    return
  }
  const sym = raw.replace(/\*+$/, '').toUpperCase()
  if (!sym || sym === 'PENDING ACTIVITY') {
    res.status(400).json({ ok: false, error: 'bad_symbol' })
    return
  }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`
    const r = await fetch(url, { headers: { 'User-Agent': 'retirement-calculator/1.0' } })
    if (!r.ok) {
      res.status(502).json({ ok: false, error: 'upstream' })
      return
    }
    const data = (await r.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }> }
    }
    const result = data?.chart?.result?.[0]
    const meta = result?.meta
    const price = meta?.regularMarketPrice
    const prev = meta?.chartPreviousClose ?? meta?.previousClose ?? price
    if (typeof price !== 'number' || !Number.isFinite(price)) {
      res.status(404).json({ ok: false, error: 'no_price' })
      return
    }
    const prevN = typeof prev === 'number' && Number.isFinite(prev) && prev !== 0 ? prev : price
    const changePct = prevN !== 0 ? ((price - prevN) / prevN) * 100 : 0
    res.json({
      ok: true,
      symbol: sym,
      price,
      previousClose: prevN,
      changePct,
    })
  } catch {
    res.status(500).json({ ok: false, error: 'exception' })
  }
})

function installProductionClient(app: express.Application) {
  const serve =
    process.env.SERVE_CLIENT === '1' ||
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT != null
  if (!serve) return

  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist')
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.warn(`[static] client build not found at ${distDir} — API only`)
    return
  }

  app.use(express.static(distDir, { index: false, maxAge: '7d' }))
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api/') || req.path === '/api') return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
  console.log(`[static] serving client from ${distDir}`)
}

async function main() {
  await ensureSchema()
  installProductionClient(app)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
