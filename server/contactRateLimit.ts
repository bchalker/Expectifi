const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 3

const hitsByIp = new Map<string, number[]>()

export function clientIpFromRequest(req: {
  ip?: string
  headers: Record<string, string | string[] | undefined>
}): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(',')[0]?.trim() || 'unknown'
  }
  return req.ip?.trim() || 'unknown'
}

/** Returns true if the request is allowed, false if rate limited. */
export function checkContactRateLimit(ip: string): boolean {
  const now = Date.now()
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    hitsByIp.set(ip, recent)
    return false
  }
  recent.push(now)
  hitsByIp.set(ip, recent)
  return true
}

export function resetContactRateLimitForTests(): void {
  hitsByIp.clear()
}
