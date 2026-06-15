const WISE_API_BASE = (process.env.WISE_API_BASE || 'https://api.wise.com').replace(/\/$/, '')
const WISE_API_TOKEN = process.env.WISE_API_TOKEN?.trim() || ''
const WISE_CLIENT_ID = process.env.WISE_CLIENT_ID?.trim() || ''
const WISE_CLIENT_SECRET = process.env.WISE_CLIENT_SECRET?.trim() || ''

const OPEN_ER_API_URL = 'https://open.er-api.com/v6/latest/USD'

/** Illustrative quote amount — rate is independent of size for display. */
const WISE_QUOTE_SOURCE_AMOUNT = 1000

export type ExchangeRateSource = 'wise' | 'open-er-api'

export type ExchangeRateQuote = {
  currencyCode: string
  rate: number
  source: ExchangeRateSource
  updatedUtc: string
}

type WiseRateRow = {
  source?: string
  target?: string
  rate?: number
  time?: string
}

type WiseUnauthenticatedQuote = {
  rate?: number
  createdTime?: string
  rateExpirationTime?: string
  sourceCurrency?: string
  targetCurrency?: string
}

type OpenErApiLatestResponse = {
  result?: string
  time_last_update_utc?: string
  rates?: Record<string, number>
}

const quoteCache = new Map<string, { expiresAt: number; quote: ExchangeRateQuote }>()
/** Wise public quotes refresh often; cache briefly to respect rate limits. */
const CACHE_TTL_MS = 5 * 60 * 1000

export function isWiseAuthConfigured(): boolean {
  return Boolean(WISE_API_TOKEN || (WISE_CLIENT_ID && WISE_CLIENT_SECRET))
}

/** Wise display rates are available without credentials via POST /v3/quotes. */
export function isWisePublicQuotesAvailable(): boolean {
  return true
}

function readCache(currencyCode: string): ExchangeRateQuote | null {
  const hit = quoteCache.get(currencyCode)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    quoteCache.delete(currencyCode)
    return null
  }
  return hit.quote
}

function writeCache(quote: ExchangeRateQuote): void {
  quoteCache.set(quote.currencyCode, {
    quote,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function wiseAuthHeaders(): HeadersInit {
  if (WISE_API_TOKEN) {
    return { Authorization: `Bearer ${WISE_API_TOKEN}` }
  }
  const basic = Buffer.from(`${WISE_CLIENT_ID}:${WISE_CLIENT_SECRET}`).toString('base64')
  return { Authorization: `Basic ${basic}` }
}

/** Mid-market rate via Wise unauthenticated quote — no API key required. */
async function fetchWisePublicUsdRate(currencyCode: string): Promise<ExchangeRateQuote | null> {
  const sym = currencyCode.toUpperCase()
  const url = `${WISE_API_BASE}/v3/quotes`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceCurrency: 'USD',
        targetCurrency: sym,
        sourceAmount: WISE_QUOTE_SOURCE_AMOUNT,
      }),
    })
    if (!res.ok) return null

    const json = (await res.json()) as WiseUnauthenticatedQuote
    if (typeof json.rate !== 'number' || json.rate <= 0) return null

    return {
      currencyCode: sym,
      rate: json.rate,
      source: 'wise',
      updatedUtc: json.createdTime ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Authenticated spot rate — optional when WISE_API_TOKEN or partner credentials are set. */
async function fetchWiseAuthenticatedUsdRate(currencyCode: string): Promise<ExchangeRateQuote | null> {
  if (!isWiseAuthConfigured()) return null

  const sym = currencyCode.toUpperCase()
  const url = `${WISE_API_BASE}/v1/rates?source=USD&target=${sym}`

  try {
    const res = await fetch(url, { headers: wiseAuthHeaders() })
    if (!res.ok) return null

    const json = (await res.json()) as WiseRateRow | WiseRateRow[]
    const rows = Array.isArray(json) ? json : [json]
    const match =
      rows.find((row) => row.source === 'USD' && row.target === sym && typeof row.rate === 'number') ??
      rows.find((row) => typeof row.rate === 'number')

    if (!match?.rate || match.rate <= 0) return null

    return {
      currencyCode: sym,
      rate: match.rate,
      source: 'wise',
      updatedUtc: match.time ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

async function fetchOpenErUsdRate(currencyCode: string): Promise<ExchangeRateQuote | null> {
  const sym = currencyCode.toUpperCase()

  try {
    const res = await fetch(OPEN_ER_API_URL)
    if (!res.ok) return null

    const json = (await res.json()) as OpenErApiLatestResponse
    if (json.result !== 'success' || !json.rates) return null

    const rate = json.rates[sym]
    if (typeof rate !== 'number' || rate <= 0) return null

    return {
      currencyCode: sym,
      rate,
      source: 'open-er-api',
      updatedUtc: json.time_last_update_utc ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** USD → local currency spot rate. Prefers Wise (public quotes, then optional auth). */
export async function getUsdExchangeRateQuote(currencyCode: string): Promise<ExchangeRateQuote | null> {
  const sym = currencyCode.toUpperCase()
  if (!sym || sym === 'USD') return null

  const cached = readCache(sym)
  if (cached) return cached

  const fromWiseAuth = await fetchWiseAuthenticatedUsdRate(sym)
  const fromWisePublic = fromWiseAuth ?? (await fetchWisePublicUsdRate(sym))
  const quote = fromWisePublic ?? (await fetchOpenErUsdRate(sym))
  if (quote) writeCache(quote)
  return quote
}

export function logWiseConfigAtStartup(): void {
  if (isWiseAuthConfigured()) {
    console.log(
      '[exchange-rates] Wise authenticated API configured — using /v1/rates when available, else public /v3/quotes',
    )
    return
  }
  console.log(
    '[exchange-rates] Wise public quote API enabled (no credentials required) — open.er-api.com used as fallback',
  )
}
