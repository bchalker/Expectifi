import nodemailer from 'nodemailer'

const SUPPORT_EMAIL = 'support@expectifi.com'

export type ContactEmailInput = {
  name: string
  email: string
  subject: string
  message: string
  userId: string | null
  timestamp: string
  userAgent: string
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(input: ContactEmailInput): string {
  return `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a;">
      <p><strong>From:</strong> ${escapeHtml(input.name)} (${escapeHtml(input.email)})</p>
      <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <p><strong>Submitted:</strong> ${escapeHtml(input.timestamp)}</p>
      <p><strong>User ID:</strong> ${escapeHtml(input.userId ?? 'not authenticated')}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(input.message)}</p>
      <hr />
      <p style="font-size: 12px; color: #666;"><strong>User Agent:</strong> ${escapeHtml(input.userAgent)}</p>
    </div>
  `.trim()
}

function buildText(input: ContactEmailInput): string {
  return [
    `From: ${input.name} (${input.email})`,
    `Subject: ${input.subject}`,
    `Submitted: ${input.timestamp}`,
    `User ID: ${input.userId ?? 'not authenticated'}`,
    '',
    input.message,
    '',
    `User Agent: ${input.userAgent}`,
  ].join('\n')
}

export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const host = process.env.SMTP_HOST?.trim()
  const portStr = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.CONTACT_FROM?.trim() ||
    (user ? `Expectifi <${user}>` : '')

  if (!host || !portStr || !user || !pass || !from) {
    throw new Error('smtp_not_configured')
  }

  const port = Number(portStr)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('smtp_not_configured')
  }

  const secure = process.env.SMTP_SECURE === 'true' || port === 465

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    ...(secure ? {} : { requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false' }),
  })

  try {
    await transporter.sendMail({
      from,
      to: SUPPORT_EMAIL,
      replyTo: input.email,
      subject: `[Expectifi] ${input.subject} from ${input.name}`,
      html: buildHtml(input),
      text: buildText(input),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[contact] SMTP send failed:', message)
    throw new Error('smtp_send_failed')
  }
}

export function logContactMailConfigAtStartup(): void {
  const host = process.env.SMTP_HOST?.trim()
  const port = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim() || process.env.CONTACT_FROM?.trim()

  if (host && port && user && pass && from) {
    console.log(`[contact] SMTP configured (${host}:${port}) → ${SUPPORT_EMAIL}`)
    return
  }

  const missing = [
    !host && 'SMTP_HOST',
    !port && 'SMTP_PORT',
    !user && 'SMTP_USER',
    !pass && 'SMTP_PASS',
    !from && 'SMTP_FROM',
  ].filter(Boolean)

  console.warn(
    `[contact] SMTP not configured (${missing.join(', ')}) — /api/contact will return 503`,
  )
}
