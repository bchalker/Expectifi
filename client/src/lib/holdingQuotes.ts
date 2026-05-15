import { useEffect, useMemo, useState } from 'react'
import { isFidelityPendingActivityRow, normalizeFidelityImportSymbol, type FidelityPositionRow } from './fidelityCsv'

export type HoldingQuote = {
  symbol: string
  price: number
  changePct: number
}

export async function fetchHoldingQuote(symbol: string): Promise<HoldingQuote | null> {
  const s = normalizeFidelityImportSymbol(symbol).toUpperCase()
  if (!s) return null
  try {
    const r = await fetch(`/api/quote/${encodeURIComponent(s)}`)
    const j = (await r.json()) as {
      ok?: boolean
      symbol?: string
      price?: number
      changePct?: number
    }
    if (!j?.ok || typeof j.price !== 'number' || !Number.isFinite(j.price)) return null
    return {
      symbol: typeof j.symbol === 'string' ? j.symbol : s,
      price: j.price,
      changePct: typeof j.changePct === 'number' && Number.isFinite(j.changePct) ? j.changePct : 0,
    }
  } catch {
    return null
  }
}

function quoteKeyFromRows(rows: FidelityPositionRow[]): string {
  const set = new Set<string>()
  for (const row of rows) {
    if (isFidelityPendingActivityRow(row)) continue
    const s = normalizeFidelityImportSymbol(row.symbol).toUpperCase()
    if (s) set.add(s)
  }
  return [...set].sort().join(',')
}

/** Polls `/api/quote` for unique symbols in `rows` (via dev proxy to the local API server). */
export function useHoldingQuotes(rows: FidelityPositionRow[], enabled: boolean) {
  const key = useMemo(() => quoteKeyFromRows(rows), [rows])

  const [map, setMap] = useState(() => new Map<string, HoldingQuote>())

  useEffect(() => {
    if (!enabled || !key) {
      setMap(new Map())
      return
    }
    let cancelled = false
    async function load() {
      const syms = key.split(',').filter(Boolean)
      const next = new Map<string, HoldingQuote>()
      await Promise.all(
        syms.map(async (sym) => {
          const q = await fetchHoldingQuote(sym)
          if (q) next.set(sym.toUpperCase(), q)
        }),
      )
      if (!cancelled) setMap(next)
    }
    load()
    const id = setInterval(load, 120_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, key])

  return map
}
