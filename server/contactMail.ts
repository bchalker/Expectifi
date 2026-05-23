import nodemailer from 'nodemailer'

/** Public support address shown in the UI. Form notifications use CONTACT_TO when set. */
export const PUBLIC_SUPPORT_EMAIL = 'support@expectifi.com'

const DEFAULT_CONTACT_TO = PUBLIC_SUPPORT_EMAIL
const SMTP_CONNECT_MS = 12_000

export function contactDeliveryAddress(): string {
  return process.env.CONTACT_TO?.trim() || DEFAULT_CONTACT_TO
}

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

function resolveFromAddress(smtpUser?: string): string {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.CONTACT_FROM?.trim() ||
    (smtpUser ? `Expectifi <${smtpUser}>` : '')
  )
}

export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const host = process.env.SMTP_HOST?.trim()
  const portStr = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = resolveFromAddress(user)

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
    connectionTimeout: SMTP_CONNECT_MS,
    greetingTimeout: SMTP_CONNECT_MS,
    socketTimeout: SMTP_CONNECT_MS,
    ...(secure ? {} : { requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false' }),
  })

  try {
    await transporter.sendMail({
      from,
      to: contactDeliveryAddress(),
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
  const from = resolveFromAddress(user)

  if (host && port && user && pass && from) {
    console.log(
      `[contact] SMTP configured (${host}:${port}) → ${contactDeliveryAddress()}`,
    )
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
    `[contact] SMTP not configured (${missing.join(', ')}); /api/contact will return 503`,
  )
}
