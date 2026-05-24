export type UserPrefs = {
  dob: string
  retirementAge: number
  monthlyGoal: number
  ssClaimingAge: number
  residenceCountry?: string
}

const RETIRE_AGE_MIN = 50
const RETIRE_AGE_MAX = 80

function isValidIsoDateString(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim())
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false
  const birth = new Date(y, mo, d)
  return !Number.isNaN(birth.getTime())
}

function normalizeSsClaimAge(age: number): number {
  const n = Math.round(age)
  if (n <= 62) return 62
  if (n >= 70) return 70
  if (n <= 64) return 62
  if (n <= 68) return 67
  return 70
}

export function parseUserPrefs(raw: unknown): UserPrefs | null {
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
  const dob = typeof o.dob === 'string' ? o.dob.trim() : ''
  const retirementAge = typeof o.retirementAge === 'number' ? o.retirementAge : Number(o.retirementAge)
  const monthlyGoal = typeof o.monthlyGoal === 'number' ? o.monthlyGoal : Number(o.monthlyGoal)
  const ssClaimingAge =
    typeof o.ssClaimingAge === 'number' ? o.ssClaimingAge : Number(o.ssClaimingAge)
  if (!isValidIsoDateString(dob)) return null
  const age = Math.round(retirementAge)
  const goal = Math.round(monthlyGoal)
  const ss = normalizeSsClaimAge(ssClaimingAge)
  if (!Number.isFinite(age) || age < RETIRE_AGE_MIN || age > RETIRE_AGE_MAX) return null
  if (!Number.isFinite(goal) || goal <= 0) return null
  const residenceCountry =
    typeof o.residenceCountry === 'string' ? o.residenceCountry.trim() : undefined
  return {
    dob,
    retirementAge: age,
    monthlyGoal: goal,
    ssClaimingAge: ss,
    ...(residenceCountry ? { residenceCountry } : {}),
  }
}
