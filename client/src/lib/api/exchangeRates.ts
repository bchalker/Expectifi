import { readApiCache, writeApiCache } from './apiCache'

const NAMESPACE = 'exchangerate'

export type ExchangeRatePoint = { date: string; rate: number }

export type DollarStrengthSeries = {
  points: ExchangeRatePoint[]
  currencyCode: string
  /** Positive = USD buys more local currency than at start of window. */
  trendPct: number
  /** False when only a spot rate is available (no multi-year series). */
  historyAvailable: boolean
}

type FrankfurterTimeseries = {
  amount?: number
  base?: string
  start_date?: string
  end_date?: string
  rates?: Record<string, Record<string, number>>
}

type OpenErApiLatest = {
  result?: string
  rates?: Record<string, number>
}

function endDate(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function startDateYearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function seriesFromPoints(
  points: ExchangeRatePoint[],
  currencyCode: string,
  historyAvailable: boolean,
): DollarStrengthSeries | null {
  if (!points.length) return null
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0].rate
  const last = sorted[sorted.length - 1].rate
  const trendPct =
    historyAvailable && sorted.length >= 2 && first > 0
      ? ((last - first) / first) * 100
      : 0
  return {
    points: sorted,
    currencyCode,
    trendPct,
    historyAvailable: historyAvailable && sorted.length >= 2,
  }
}

async function fetchFrankfurterHistory(currencyCode: string): Promise<DollarStrengthSeries | null> {
  const start = startDateYearsAgo(10)
  const end = endDate()
  const sym = currencyCode.toUpperCase()
  const url = `https://api.frankfurter.app/${start}..${end}?from=USD&to=${sym}`
  const res = await fetch(url)
  if (!res.ok) return null

  const json = (await res.json()) as FrankfurterTimeseries
  const rates = json.rates
  if (!rates) return null

  const points: ExchangeRatePoint[] = []
  for (const [date, row] of Object.entries(rates)) {
    const rate = row[sym]
    if (typeof rate === 'number' && rate > 0) {
      points.push({ date, rate })
    }
  }

  return seriesFromPoints(points, sym, true)
}

async function fetchOpenErApiLatest(currencyCode: string): Promise<number | null> {
  const sym = currencyCode.toUpperCase()
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  if (!res.ok) return null
  const json = (await res.json()) as OpenErApiLatest
  if (json.result !== 'success' || !json.rates) return null
  const rate = json.rates[sym]
  return typeof rate === 'number' && rate > 0 ? rate : null
}

/** USD vs local currency — Frankfurter history when supported, else open.er-api spot rate. */
export async function getUsdExchangeHistory(
  currencyCode: string,
): Promise<DollarStrengthSeries | null> {
  if (!currencyCode || currencyCode === 'USD') return null
  const sym = currencyCode.toUpperCase()
  const cacheKey = `usd-v2-${sym}`
  const cached = readApiCache<DollarStrengthSeries>(NAMESPACE, cacheKey)
  if (cached?.currencyCode && cached.points.length) return cached

  try {
    const fromFrankfurter = await fetchFrankfurterHistory(sym)
    if (fromFrankfurter) {
      writeApiCache(NAMESPACE, cacheKey, fromFrankfurter)
      return fromFrankfurter
    }

    const latest = await fetchOpenErApiLatest(sym)
    if (latest == null) return null

    const spotOnly = seriesFromPoints([{ date: endDate(), rate: latest }], sym, false)
    if (spotOnly) writeApiCache(NAMESPACE, cacheKey, spotOnly)
    return spotOnly
  } catch {
    return null
  }
}

export function formatUsdToLocalRate(rate: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase()
  if (code === 'JPY' || code === 'VND' || code === 'KRW' || code === 'IDR') {
    return rate.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  if (rate >= 100) return rate.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (rate >= 10) return rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return rate.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })
}
