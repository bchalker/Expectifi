export const CONTACT_SUBJECTS = [
  { value: 'General feedback', label: 'General feedback' },
  { value: 'Bug report', label: 'Bug report' },
  { value: 'Billing & subscription', label: 'Billing & subscription' },
  { value: 'Feature request', label: 'Feature request' },
  { value: 'Data question', label: 'Data question' },
  { value: 'Other', label: 'Other' },
] as const

export type ContactSubjectValue = (typeof CONTACT_SUBJECTS)[number]['value']

export type ContactFormPayload = {
  name: string
  email: string
  subject: ContactSubjectValue
  message: string
  userId?: string
  timestamp: string
  userAgent: string
}

export type ContactSubmitResponse =
  | { ok: true }
  | { ok: false; error: string }

export async function submitContactForm(
  payload: ContactFormPayload,
): Promise<ContactSubmitResponse> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { ok: false, error: 'send_failed' }
  }
  const data = (await res.json()) as ContactSubmitResponse
  if (!res.ok && !('ok' in data)) {
    return { ok: false, error: 'send_failed' }
  }
  return data
}
