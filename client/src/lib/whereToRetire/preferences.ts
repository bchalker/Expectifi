const PREFERENCES_KEY = 'wtr-preferences'

export type WtrRegionScope = 'us-only' | 'international-only' | 'both'

export type WtrPriority =
  | 'lowest-tax'
  | 'lowest-col'
  | 'highest-surplus'
  | 'quality-of-life'
  | 'healthcare-access'
  | 'dollar-strength'

export type WtrDealbreaker = 'english-speaking' | 'medicare' | 'none'

export type WtrPreferences = {
  completed: boolean
  skipped?: boolean
  regionScope: WtrRegionScope
  priorities: WtrPriority[]
  dealbreakers: WtrDealbreaker[]
}

export const DEFAULT_PREFERENCES: WtrPreferences = {
  completed: false,
  regionScope: 'both',
  priorities: [],
  dealbreakers: [],
}

export function loadPreferences(): WtrPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WtrPreferences
    if (!parsed || typeof parsed !== 'object') return null
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities.slice(0, 2) : [],
      dealbreakers: Array.isArray(parsed.dealbreakers) ? parsed.dealbreakers : [],
    }
  } catch {
    return null
  }
}

export function savePreferences(prefs: WtrPreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
}

export function hasCompletedPreferences(): boolean {
  const prefs = loadPreferences()
  return prefs != null && (prefs.completed || prefs.skipped === true)
}

export function resetPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFERENCES_KEY)
}
