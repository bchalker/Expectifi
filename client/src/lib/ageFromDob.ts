/** ISO calendar date `YYYY-MM-DD` (local date semantics). */
export function ageFromIsoDateString(iso: string, asOf: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim())
  if (!m) return 55
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return 55
  const birth = new Date(y, mo, d)
  if (Number.isNaN(birth.getTime())) return 55
  let age = asOf.getFullYear() - birth.getFullYear()
  const md = asOf.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && asOf.getDate() < birth.getDate())) age -= 1
  return Math.min(120, Math.max(0, age))
}

export function clampedAgeFromDob(iso: string, asOf: Date = new Date(), lo = 18, hi = 100): number {
  return Math.min(hi, Math.max(lo, ageFromIsoDateString(iso, asOf)))
}

/** Migration: approximate DOB as Jan 1 of birth year from an integer age. */
export function approxIsoDobFromAge(age: number, asOf: Date = new Date()): string {
  const a = Math.round(age)
  if (!Number.isFinite(a)) return '1971-01-01'
  const clamped = Math.min(100, Math.max(18, a))
  const y = asOf.getFullYear() - clamped
  return `${y}-01-01`
}

export function isValidIsoDateString(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim())
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d
}
