import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { COOKIE_NAME, createToken, verifyToken } from './authToken.js'
import { ensureSchema, getPool } from './db.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'retirement-calculator-api' })
})

app.get('/api/auth/me', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  res.json({ ok: true, user: { id: u.userId, email: u.email } })
})

app.post('/api/auth/register', async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const email = normalizeEmail(emailRaw)
  if (!email.includes('@') || email.length > 254) {
    res.status(400).json({ ok: false, error: 'invalid_email' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ ok: false, error: 'password_too_short' })
    return
  }
  const pool = getPool()
  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  try {
    await pool.execute<ResultSetHeader>(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [id, email, passwordHash],
    )
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : ''
    if (code === 'ER_DUP_ENTRY') {
      res.status(409).json({ ok: false, error: 'email_in_use' })
      return
    }
    throw e
  }
  const token = await createToken(id, email)
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({ ok: true, user: { id, email } })
})

app.post('/api/auth/login', async (req, res) => {
  const emailRaw = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const email = normalizeEmail(emailRaw)
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'invalid_request' })
    return
  }
  const pool = getPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1',
    [email],
  )
  const row = rows[0] as { id: string; passwordHash: string } | undefined
  if (!row) {
    res.status(401).json({ ok: false, error: 'invalid_credentials' })
    return
  }
  const ok = await bcrypt.compare(password, row.passwordHash)
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
  res.json({ ok: true, user: { id: row.id, email } })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax' })
  res.json({ ok: true })
})

app.get('/api/scenarios', async (req, res) => {
  const u = await readSessionUser(req)
  if (!u) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  const pool = getPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, user_id AS userId, name, inputs, created_at AS createdAt FROM scenarios WHERE user_id = ? ORDER BY created_at DESC',
    [u.userId],
  )
  const list = (rows as RowDataPacket[]).map((r: RowDataPacket) => ({
    id: r.id as string,
    user_id: r.userId as string,
    name: r.name as string,
    inputs: r.inputs,
    created_at:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt ?? ''),
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
  const pool = getPool()
  await pool.execute<ResultSetHeader>(
    'INSERT INTO scenarios (id, user_id, name, inputs) VALUES (?, ?, ?, ?)',
    [id, u.userId, name, JSON.stringify(inputs)],
  )
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
  const pool = getPool()
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM scenarios WHERE id = ? AND user_id = ?',
    [id, u.userId],
  )
  if (result.affectedRows === 0) {
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

async function main() {
  await ensureSchema()
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
