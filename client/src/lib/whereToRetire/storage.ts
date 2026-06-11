const DESTINATIONS_KEY = 'wtr-destinations'
const LEGACY_DESTINATIONS_KEY = 'where-to-retire-destinations'
const COST_PREFIX = 'where-to-retire-cost:'
const INCOME_OVERRIDE_KEY = 'wtr-income-override'

export type StoredDestinationState = {
  keys: string[]
  manualKeys: string[]
  autoKeys: string[]
}

export type StoredDestination = {
  key: string
}

/** Preserve first occurrence order; drop empty strings. */
export function dedupeDestinationKeys(keys: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const key of keys) {
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function normalizeDestinationState(state: StoredDestinationState): StoredDestinationState {
  const keys = dedupeDestinationKeys(state.keys)
  const manualKeys = dedupeDestinationKeys(state.manualKeys.filter((k) => keys.includes(k)))
  const autoKeys = dedupeDestinationKeys(
    state.autoKeys.filter((k) => keys.includes(k) && !manualKeys.includes(k)),
  )
  return { keys, manualKeys, autoKeys }
}

function readLegacyKeys(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_DESTINATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredDestination[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((d) => d.key).filter(Boolean)
  } catch {
    return []
  }
}

export function loadDestinationState(): StoredDestinationState {
  if (typeof window === 'undefined') {
    return { keys: [], manualKeys: [], autoKeys: [] }
  }
  try {
    const raw = localStorage.getItem(DESTINATIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDestinationState
      if (parsed && Array.isArray(parsed.keys)) {
        return normalizeDestinationState({
          keys: parsed.keys.filter(Boolean),
          manualKeys: Array.isArray(parsed.manualKeys) ? parsed.manualKeys.filter(Boolean) : [],
          autoKeys: Array.isArray(parsed.autoKeys) ? parsed.autoKeys.filter(Boolean) : [],
        })
      }
    }
    const legacy = readLegacyKeys()
    if (legacy.length) {
      return normalizeDestinationState({ keys: legacy, manualKeys: legacy, autoKeys: [] })
    }
    return { keys: [], manualKeys: [], autoKeys: [] }
  } catch {
    return { keys: [], manualKeys: [], autoKeys: [] }
  }
}

export function loadSelectedDestinationKeys(): string[] {
  return loadDestinationState().keys
}

export function saveDestinationState(state: StoredDestinationState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(normalizeDestinationState(state)))
}

export function saveSelectedDestinationKeys(keys: string[]): void {
  const prev = loadDestinationState()
  const manualKeys = keys.filter((k) => prev.manualKeys.includes(k))
  const autoKeys = keys.filter((k) => prev.autoKeys.includes(k) && !manualKeys.includes(k))
  saveDestinationState({ keys, manualKeys, autoKeys })
}

export function setAutoPopulatedKeys(autoKeys: string[], manualKeys: string[] = []): void {
  const keys = dedupeDestinationKeys([
    ...manualKeys,
    ...autoKeys.filter((k) => !manualKeys.includes(k)),
  ])
  saveDestinationState({ keys, manualKeys, autoKeys })
}

export function markKeyManual(key: string): void {
  const state = loadDestinationState()
  const manualKeys = [...new Set([...state.manualKeys, key])]
  const autoKeys = state.autoKeys.filter((k) => k !== key)
  const keys = state.keys.includes(key)
    ? dedupeDestinationKeys(state.keys)
    : dedupeDestinationKeys([...state.keys, key])
  saveDestinationState({ keys, manualKeys, autoKeys })
}

export function replaceLowestAutoKey(newKey: string): string | null {
  const state = loadDestinationState()
  if (!state.autoKeys.length) return null
  const removed = state.autoKeys[state.autoKeys.length - 1]
  if (state.keys.includes(newKey)) return null
  const autoKeys = [...state.autoKeys.slice(0, -1), newKey]
  const keys = dedupeDestinationKeys(state.keys.map((k) => (k === removed ? newKey : k)))
  saveDestinationState({
    keys,
    manualKeys: state.manualKeys,
    autoKeys,
  })
  return removed
}

export function loadIncomeOverride(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(INCOME_OVERRIDE_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function saveIncomeOverride(value: number | null): void {
  if (typeof window === 'undefined') return
  if (value == null) {
    localStorage.removeItem(INCOME_OVERRIDE_KEY)
    return
  }
  localStorage.setItem(INCOME_OVERRIDE_KEY, String(Math.round(value)))
}

export function clearGuestWhereToRetireStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DESTINATIONS_KEY)
    localStorage.removeItem(LEGACY_DESTINATIONS_KEY)
    localStorage.removeItem(INCOME_OVERRIDE_KEY)
    localStorage.removeItem('wtr-preferences')
    localStorage.removeItem('retirement_preferences')
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(COST_PREFIX)) keysToRemove.push(key)
    }
    for (const key of keysToRemove) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
