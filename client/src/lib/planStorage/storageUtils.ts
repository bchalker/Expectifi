export function readJsonFromLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJsonToLocalStorage(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeLocalStorageKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** @alias removeLocalStorageKey */
export const removeFromLocalStorage = removeLocalStorageKey
