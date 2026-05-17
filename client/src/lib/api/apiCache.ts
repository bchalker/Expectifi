const TTL_MS = 24 * 60 * 60 * 1000

type CacheEnvelope<T> = {
  storedAt: number
  data: T
}

function cacheKey(namespace: string, key: string): string {
  return `hp-api-cache:${namespace}:${key}`
}

export function readApiCache<T>(namespace: string, key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(namespace, key))
    if (!raw) return null
    const env = JSON.parse(raw) as CacheEnvelope<T>
    if (!env?.storedAt || Date.now() - env.storedAt > TTL_MS) {
      localStorage.removeItem(cacheKey(namespace, key))
      return null
    }
    return env.data
  } catch {
    return null
  }
}

export function writeApiCache<T>(namespace: string, key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const env: CacheEnvelope<T> = { storedAt: Date.now(), data }
    localStorage.setItem(cacheKey(namespace, key), JSON.stringify(env))
  } catch {
    /* quota */
  }
}

export function formatDataFreshness(storedAt: number | null): string {
  if (!storedAt) return 'Not cached'
  const ageH = Math.floor((Date.now() - storedAt) / (60 * 60 * 1000))
  if (ageH < 1) return 'Updated within the last hour'
  if (ageH < 24) return `Updated ${ageH}h ago`
  return 'Stale — refreshing'
}

export function cacheStoredAt(namespace: string, key: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(namespace, key))
    if (!raw) return null
    const env = JSON.parse(raw) as CacheEnvelope<unknown>
    return env?.storedAt ?? null
  } catch {
    return null
  }
}
