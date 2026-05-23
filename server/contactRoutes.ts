import type { Express, Request, Response } from 'express'
import { sendContactEmail } from './contactMail.js'
import { checkContactRateLimit, clientIpFromRequest } from './contactRateLimit.js'

export const CONTACT_SUBJECTS = [
  'General feedback',
  'Bug report',
  'Billing & subscription',
  'Feature request',
  'Data question',
  'Other',
] as const

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

const MAX_MESSAGE_LENGTH = 1000
const MAX_NAME_LENGTH = 120

type SessionReader = (req: Request) => Promise<{ userId: string; email: string } | null>

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

function contactSubjectLabel(raw: unknown): ContactSubject | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return (CONTACT_SUBJECTS as readonly string[]).includes(t) ? (t as ContactSubject) : null
}

export function installContactRoutes(app: Express, readSessionUser: SessionReader): void {
  app.post('/api/contact', async (req: Request, res: Response) => {
    const ip = clientIpFromRequest(req)
    if (!checkContactRateLimit(ip)) {
      res.status(429).json({ ok: false, error: 'rate_limited' })
      return
    }

    const nameRaw = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
    const subject = contactSubjectLabel(req.body?.subject)
    const messageRaw = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    const userAgent =
      typeof req.body?.userAgent === 'string' ? req.body.userAgent.trim().slice(0, 512) : ''
    const timestamp =
      typeof req.body?.timestamp === 'string' && req.body.timestamp.trim()
        ? req.body.timestamp.trim()
        : new Date().toISOString()

    if (!nameRaw || nameRaw.length > MAX_NAME_LENGTH) {
      res.status(400).json({ ok: false, error: 'invalid_name' })
      return
    }
    if (!emailRaw || !isValidEmail(emailRaw)) {
      res.status(400).json({ ok: false, error: 'invalid_email' })
      return
    }
    if (!subject) {
      res.status(400).json({ ok: false, error: 'invalid_subject' })
      return
    }
    if (!messageRaw || messageRaw.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ ok: false, error: 'invalid_message' })
      return
    }

    const session = await readSessionUser(req)
    const bodyUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : null
    const userId = session?.userId ?? bodyUserId

    if (session && bodyUserId && bodyUserId !== session.userId) {
      res.status(400).json({ ok: false, error: 'invalid_user' })
      return
    }

    try {
      await sendContactEmail({
        name: nameRaw,
        email: emailRaw,
        subject,
        message: messageRaw,
        userId: userId ?? null,
        timestamp,
        userAgent: userAgent || req.headers['user-agent']?.toString().slice(0, 512) || 'unknown',
      })
      res.json({ ok: true })
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'smtp_not_configured') {
        res.status(503).json({ ok: false, error: 'contact_not_configured' })
        return
      }
      if (e instanceof Error) {
        console.error('[contact] send failed:', e.message)
      } else {
        console.error('[contact] send failed:', e)
      }
      res.status(502).json({ ok: false, error: 'send_failed' })
    }
  })
}
