export const PLAN_STATE_PAYLOAD_VERSION = 1 as const

export type UserPlanStateBalanceModes = {
  retirement?: 'manual' | 'imported'
  brokerage?: 'manual' | 'imported'
}

export type UserPlanStatePayload = {
  version: typeof PLAN_STATE_PAYLOAD_VERSION
  savedAt: string
  profile: unknown | null
  accounts: unknown | null
  session: unknown | null
  lifePlans: unknown | null
  growthLifeEvents: unknown | null
  balanceModes: UserPlanStateBalanceModes | null
}

function parseBalanceModes(raw: unknown): UserPlanStateBalanceModes | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const retirement = o.retirement === 'manual' || o.retirement === 'imported' ? o.retirement : undefined
  const brokerage = o.brokerage === 'manual' || o.brokerage === 'imported' ? o.brokerage : undefined
  if (!retirement && !brokerage) return null
  return { retirement, brokerage }
}

export function parseUserPlanStatePayload(raw: unknown): UserPlanStatePayload | null {
  if (raw == null) return null
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  if (o.version !== PLAN_STATE_PAYLOAD_VERSION) return null
  const savedAt = typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString()
  return {
    version: PLAN_STATE_PAYLOAD_VERSION,
    savedAt,
    profile: o.profile ?? null,
    accounts: o.accounts ?? null,
    session: o.session ?? null,
    lifePlans: o.lifePlans ?? null,
    growthLifeEvents: o.growthLifeEvents ?? null,
    balanceModes: parseBalanceModes(o.balanceModes),
  }
}

export function planStatePayloadHasData(payload: UserPlanStatePayload): boolean {
  if (payload.session != null) return true
  if (payload.profile != null && typeof payload.profile === 'object') return true
  if (payload.accounts != null && typeof payload.accounts === 'object') return true
  return false
}
