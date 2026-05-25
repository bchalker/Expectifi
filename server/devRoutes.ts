import type { Express, Request, Response } from 'express'
import { COOKIE_NAME, createToken } from './authToken.js'
import { dbQuery } from './dbQuery.js'

function devRoutesAllowed(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false
  const host = (req.hostname ?? '').toLowerCase()
  return host === 'localhost' || host === '127.0.0.1'
}

/** Local-only: set session cookie and redirect (for TrueLayer OAuth testing). */
export function installDevRoutes(app: Express): void {
  app.get('/api/dev/impersonate', async (req, res) => {
    if (!devRoutesAllowed(req)) {
      res.status(404).end()
      return
    }
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : ''
    const redirectRaw = typeof req.query.redirect === 'string' ? req.query.redirect.trim() : '/'
    if (!email) {
      res.status(400).send('Missing ?email=')
      return
    }
    const { rows } = await dbQuery<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [email],
    )
    const user = rows[0]
    if (!user) {
      res.status(404).send(`No user: ${email}`)
      return
    }
    const token = await createToken(user.id, email)
    const redirect =
      redirectRaw.startsWith('http://localhost') ||
      redirectRaw.startsWith('http://127.0.0.1') ||
      redirectRaw.startsWith('/')
        ? redirectRaw
        : '/'
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.redirect(302, redirect)
  })
}
