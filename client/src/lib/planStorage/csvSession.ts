import type { StoredPositionsImportV2 } from '../positionsImportStorage'
import { hasSessionCsvHoldings, setSessionHasCsvHoldings } from '../sessionFlags'

const CSV_SESSION_KEY = 'expectifi/csv-session-v1'

/**
 * Session-only CSV holdings cache for non-pro users.
 * Never touches localStorage; cleared when the tab closes.
 */
export function saveCsvSession(payload: StoredPositionsImportV2): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CSV_SESSION_KEY, JSON.stringify(payload))
    setSessionHasCsvHoldings((payload.batches?.length ?? 0) > 0)
  } catch {
    /* private mode / quota */
  }
}

export function loadCsvSession(): StoredPositionsImportV2 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CSV_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPositionsImportV2
    if (parsed?.version !== 2 || !Array.isArray(parsed.batches) || !parsed.balances) return null
    if (!hasSessionCsvHoldings() && parsed.batches.length > 0) {
      setSessionHasCsvHoldings(true)
    }
    return parsed
  } catch {
    return null
  }
}

export function clearCsvSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CSV_SESSION_KEY)
  } catch {
    /* ignore */
  }
  setSessionHasCsvHoldings(false)
}

