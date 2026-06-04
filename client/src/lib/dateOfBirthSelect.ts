import { ageFromIsoDateString, isValidIsoDateString } from './ageFromDob'

export type DobParts = {
  year: string
  month: string
  day: string
}

export const DOB_MONTHS: { id: string; label: string; short: string }[] = [
  { id: '01', label: 'January', short: 'Jan' },
  { id: '02', label: 'February', short: 'Feb' },
  { id: '03', label: 'March', short: 'Mar' },
  { id: '04', label: 'April', short: 'Apr' },
  { id: '05', label: 'May', short: 'May' },
  { id: '06', label: 'June', short: 'Jun' },
  { id: '07', label: 'July', short: 'Jul' },
  { id: '08', label: 'August', short: 'Aug' },
  { id: '09', label: 'September', short: 'Sep' },
  { id: '10', label: 'October', short: 'Oct' },
  { id: '11', label: 'November', short: 'Nov' },
  { id: '12', label: 'December', short: 'Dec' },
]

function firstKeyFromSelectSelection(keys: unknown): string | null {
  if (keys == null || keys === 'all') return null
  if (typeof keys === 'string' || typeof keys === 'number') return String(keys)
  if (typeof keys === 'object') {
    if (keys instanceof Set) {
      const it = keys.values().next()
      return it.done || it.value == null ? null : String(it.value)
    }
    if ('currentKey' in keys && keys.currentKey != null) {
      return String(keys.currentKey)
    }
    if ('anchorKey' in keys && keys.anchorKey != null) {
      return String(keys.anchorKey)
    }
    if ('values' in keys && typeof (keys as Set<unknown>).values === 'function') {
      const it = (keys as Set<unknown>).values().next()
      return it.done || it.value == null ? null : String(it.value)
    }
  }
  return null
}

export { firstKeyFromSelectSelection }

export function daysInCalendarMonth(year: number, month: number): number {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return 31
  return new Date(year, month, 0).getDate()
}

export function defaultBirthYear(asOf: Date = new Date()): number {
  return asOf.getFullYear() - 50
}

/** Year row scroll anchor when the year dropdown opens with no selection yet. */
export const DOB_YEAR_LIST_SCROLL_ANCHOR = 1976

/** Month/year picker defaults when no DOB is stored yet. */
export function defaultDobPartsForPicker(): DobParts {
  return { year: '', month: '', day: '' }
}

/** Birth years where at least one calendar date yields age in [minAge, maxAge]. */
export function validBirthYears(
  parts: Pick<DobParts, 'month' | 'day'>,
  asOf: Date = new Date(),
  minAge = 18,
  maxAge = 100,
): number[] {
  const month = parts.month ? Number(parts.month) : null
  const day = parts.day ? Number(parts.day) : null
  const minY = asOf.getFullYear() - maxAge - 1
  const maxY = asOf.getFullYear() - minAge + 1
  const out: number[] = []

  for (let y = maxY; y >= minY; y -= 1) {
    if (month && day) {
      const iso = dobPartsToIso({ year: String(y), month: parts.month!, day: parts.day! })
      if (!iso) continue
      const age = ageFromIsoDateString(iso, asOf)
      if (age >= minAge && age <= maxAge) out.push(y)
      continue
    }
    if (month) {
      const maxDay = daysInCalendarMonth(y, month)
      let ok = false
      for (let d = 1; d <= maxDay; d += 1) {
        const iso = `${y}-${parts.month}-${String(d).padStart(2, '0')}`
        if (!isValidIsoDateString(iso)) continue
        const age = ageFromIsoDateString(iso, asOf)
        if (age >= minAge && age <= maxAge) {
          ok = true
          break
        }
      }
      if (ok) out.push(y)
      continue
    }
    const janAge = ageFromIsoDateString(`${y}-01-01`, asOf)
    const decAge = ageFromIsoDateString(`${y}-12-31`, asOf)
    if (janAge >= minAge && decAge <= maxAge) out.push(y)
  }

  return out
}

export function parseIsoToDobParts(iso: string, asOf: Date = new Date()): DobParts {
  if (isValidIsoDateString(iso)) {
    const [y, m, d] = iso.trim().split('-')
    return { year: y, month: m, day: d }
  }
  const y = defaultBirthYear(asOf)
  return { year: String(y), month: '01', day: '01' }
}

export function isDobAgeInRange(
  iso: string,
  asOf: Date = new Date(),
  minAge = 18,
  maxAge = 100,
): boolean {
  if (!isValidIsoDateString(iso)) return false
  const age = ageFromIsoDateString(iso, asOf)
  return age >= minAge && age <= maxAge
}

export function isDobPartsComplete(parts: DobParts): boolean {
  return Boolean(parts.year && parts.month && parts.day)
}

export function partsFromIsoValue(iso: string): DobParts {
  if (iso && isValidIsoDateString(iso)) return clampDobParts(parseIsoToDobParts(iso))
  return defaultDobPartsForPicker()
}

export function dobPartsToIso(parts: DobParts): string | null {
  if (!parts.year || !parts.month || !parts.day) return null
  const y = Number(parts.year)
  const m = Number(parts.month)
  let d = Number(parts.day)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  const maxDay = daysInCalendarMonth(y, m)
  d = Math.min(maxDay, Math.max(1, d))
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return isValidIsoDateString(iso) ? iso : null
}

export function clampDobParts(parts: DobParts): DobParts {
  if (!parts.year || !parts.month) return parts
  const y = Number(parts.year)
  const m = Number(parts.month)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return parts
  if (!parts.day) return parts
  const maxDay = daysInCalendarMonth(y, m)
  const d = Number(parts.day)
  if (!Number.isFinite(d) || d <= maxDay) return parts
  return { ...parts, day: String(maxDay).padStart(2, '0') }
}

export function dayOptionsForParts(parts: DobParts): string[] {
  const y = Number(parts.year)
  const m = Number(parts.month)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
  }
  const n = daysInCalendarMonth(y, m)
  return Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0'))
}
