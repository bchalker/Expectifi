import { readApiCache, writeApiCache } from './apiCache'

const NAMESPACE = 'worldbank'

export type WorldBankCountryIndicators = {
  pppFactor: number | null
  inflationPct: number | null
}

type WbRow = { date: string; value: number | null }
type WbResponse = [unknown, WbRow[]]

async function fetchIndicator(
  countryCode: string,
  indicator: string,
): Promise<number | null> {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=8&date=2018:2024`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as WbResponse
    const rows = json[1]
    if (!Array.isArray(rows)) return null
    for (const row of rows) {
      if (row.value != null && Number.isFinite(row.value)) return row.value
    }
    return null
  } catch {
    return null
  }
}

export async function getWorldBankCountryIndicators(
  countryCode: string,
): Promise<WorldBankCountryIndicators> {
  const cacheKey = `indicators:${countryCode.toUpperCase()}`
  const cached = readApiCache<WorldBankCountryIndicators>(NAMESPACE, cacheKey)
  if (cached) return cached

  try {
    const iso2 = countryCode.toUpperCase()
    const [pppFactor, inflationPct] = await Promise.all([
      fetchIndicator(iso2, 'PA.NUS.PPP'),
      fetchIndicator(iso2, 'FP.CPI.TOTL.ZG'),
    ])

    const data: WorldBankCountryIndicators = { pppFactor, inflationPct }
    writeApiCache(NAMESPACE, cacheKey, data)
    return data
  } catch {
    return { pppFactor: null, inflationPct: null }
  }
}
