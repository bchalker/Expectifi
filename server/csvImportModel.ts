export type StoredCsvImportPayload = {
  version: 2
  savedAt: string
  batches: unknown[]
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
}

export function parseStoredCsvImportPayload(raw: unknown): StoredCsvImportPayload | null {
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
  if (o.version !== 2) return null
  if (!Array.isArray(o.batches)) return null
  const balances = o.balances
  if (!balances || typeof balances !== 'object') return null
  const b = balances as Record<string, unknown>
  const num = (k: string) => {
    const v = b[k]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  const savedAt = typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString()
  return {
    version: 2,
    savedAt,
    batches: o.batches,
    balances: {
      base401k: num('base401k'),
      baseSE401k: num('baseSE401k'),
      baseRoth: num('baseRoth'),
      baseHsa: num('baseHsa'),
      brkBal: num('brkBal'),
    },
  }
}
