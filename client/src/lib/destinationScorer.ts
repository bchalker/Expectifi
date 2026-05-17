import { DESTINATION_CATALOG, type DestinationCatalogEntry } from '../data/destinations'
import { getCountryTaxEntry } from '../data/countryTaxRates'
import { getHealthcareRating } from '../data/destinationHealthcare'
import { getStateTaxEntry } from '../data/stateTaxRates'
import { getTeleportFallback } from '../data/teleportFallbacks'
import { readApiCache } from './api/apiCache'
import type { DollarStrengthSeries } from './api/exchangeRates'
import { loadDestinationMonthlyCost } from './whereToRetire/storage'
import type { WtrPreferences } from './whereToRetire/preferences'

export type ScoredDestination = {
  key: string
  entry: DestinationCatalogEntry
  score: number
  matchPct: number
  surplus: number
  topReason: string
  components: {
    surplus: number
    tax: number
    col: number
    qol: number
    healthcareBonus: number
    dollarBonus: number
  }
}

const ENGLISH_SPEAKING_COUNTRY_CODES = new Set([
  'GB',
  'IE',
  'AU',
  'NZ',
  'CA',
  'CR',
])

type ScoreWeights = {
  surplus: number
  tax: number
  col: number
  qol: number
}

function getTaxRate(entry: DestinationCatalogEntry): number {
  if (entry.kind === 'us-state') {
    const state = getStateTaxEntry(entry.code)
    if (!state) return 0.05
    return state.noIncomeTax ? 0 : state.retirementIncomeRate
  }
  const country = getCountryTaxEntry(entry.code)
  return country?.effectiveRetirementRate ?? 0.1
}

function getSurplus(entry: DestinationCatalogEntry, grossMonthlyIncome: number): number {
  const rate = getTaxRate(entry)
  const cost = loadDestinationMonthlyCost(entry)
  const afterTax = grossMonthlyIncome * (1 - rate)
  return afterTax - cost
}

function getDollarTrendPct(entry: DestinationCatalogEntry): number | null {
  if (entry.kind !== 'country') return null
  const country = getCountryTaxEntry(entry.code)
  if (!country || country.currencyCode === 'USD') return null
  const cached = readApiCache<DollarStrengthSeries>(
    'exchangerate',
    `usd-${country.currencyCode.toUpperCase()}`,
  )
  return cached?.trendPct ?? null
}

function passesDealbreakers(entry: DestinationCatalogEntry, preferences: WtrPreferences): boolean {
  const dealbreakers = preferences.dealbreakers ?? []
  if (dealbreakers.includes('english-speaking')) {
    if (entry.kind === 'country' && !ENGLISH_SPEAKING_COUNTRY_CODES.has(entry.code)) {
      return false
    }
  }
  if (dealbreakers.includes('medicare')) {
    if (entry.kind !== 'us-state') return false
  }
  return true
}

function passesRegionScope(entry: DestinationCatalogEntry, preferences: WtrPreferences): boolean {
  const scope = preferences.regionScope ?? 'both'
  if (scope === 'us-only') return entry.kind === 'us-state'
  if (scope === 'international-only') return entry.kind === 'country'
  return true
}

function buildWeights(preferences: WtrPreferences): ScoreWeights {
  if (preferences.skipped || !preferences.completed) {
    return { surplus: 1, tax: 0, col: 0, qol: 0 }
  }

  let weights: ScoreWeights = { surplus: 0.4, tax: 0.2, col: 0.2, qol: 0.2 }
  const priorities = preferences.priorities ?? []

  for (const p of priorities) {
    if (p === 'lowest-tax') weights = { ...weights, tax: weights.tax * 2 }
    if (p === 'lowest-col') weights = { ...weights, col: weights.col * 2 }
    if (p === 'highest-surplus') weights = { ...weights, surplus: weights.surplus * 2 }
    if (p === 'quality-of-life') weights = { ...weights, qol: weights.qol * 2 }
  }

  const total = weights.surplus + weights.tax + weights.col + weights.qol
  if (total <= 0) return { surplus: 1, tax: 0, col: 0, qol: 0 }

  return {
    surplus: weights.surplus / total,
    tax: weights.tax / total,
    col: weights.col / total,
    qol: weights.qol / total,
  }
}

function topReasonLabel(
  components: ScoredDestination['components'],
  weights: ScoreWeights,
  preferences: WtrPreferences,
): string {
  const weighted = [
    { id: 'surplus', label: 'High monthly surplus', value: components.surplus * weights.surplus },
    { id: 'tax', label: 'Low tax burden', value: components.tax * weights.tax },
    { id: 'col', label: 'Low cost of living', value: components.col * weights.col },
    { id: 'qol', label: 'Strong quality of life', value: components.qol * weights.qol },
  ]
  weighted.sort((a, b) => b.value - a.value)

  if ((preferences.priorities ?? []).includes('healthcare-access') && components.healthcareBonus > 0) {
    return 'Strong healthcare access'
  }
  if ((preferences.priorities ?? []).includes('dollar-strength') && components.dollarBonus > 0) {
    return 'Favorable dollar trend'
  }

  return weighted[0]?.label ?? 'Balanced fit'
}

function scoreEntry(
  entry: DestinationCatalogEntry,
  grossMonthlyIncome: number,
  preferences: WtrPreferences,
  weights: ScoreWeights,
): ScoredDestination | null {
  if (!passesRegionScope(entry, preferences)) return null
  if (!passesDealbreakers(entry, preferences)) return null

  const surplus = getSurplus(entry, grossMonthlyIncome)
  const rate = getTaxRate(entry)
  const tp = getTeleportFallback(entry.teleportSlug)

  const surplusScore =
    grossMonthlyIncome > 0
      ? Math.max(0, Math.min(100, 50 + (surplus / grossMonthlyIncome) * 100))
      : 0
  const taxScore = Math.max(0, Math.min(100, (1 - rate) * 100))
  const colScore = Math.max(0, Math.min(100, (tp.col / 10) * 100))
  const qolScore = Math.max(0, Math.min(100, (tp.qol / 10) * 100))

  let healthcareBonus = 0
  if ((preferences.priorities ?? []).includes('healthcare-access')) {
    const rating = getHealthcareRating(entry.key)
    healthcareBonus = Math.max(0, (rating - 65) * 0.4)
  }

  let dollarBonus = 0
  if ((preferences.priorities ?? []).includes('dollar-strength') && entry.kind === 'country') {
    const trend = getDollarTrendPct(entry)
    if (trend != null && trend > 0) {
      dollarBonus = Math.min(15, trend * 0.5)
    }
  }

  const components = {
    surplus: surplusScore,
    tax: taxScore,
    col: colScore,
    qol: qolScore,
    healthcareBonus,
    dollarBonus,
  }

  const base =
    surplusScore * weights.surplus +
    taxScore * weights.tax +
    colScore * weights.col +
    qolScore * weights.qol

  const score = base + healthcareBonus + dollarBonus
  const maxBase = 100 * (weights.surplus + weights.tax + weights.col + weights.qol)
  const maxScore = maxBase + 15 + 15
  const matchPct = maxScore > 0 ? Math.round(Math.min(100, (score / maxScore) * 100)) : 0

  return {
    key: entry.key,
    entry,
    score,
    matchPct,
    surplus,
    topReason: topReasonLabel(components, weights, preferences),
    components,
  }
}

export function scoreDestinations(
  preferences: WtrPreferences,
  grossMonthlyIncome: number,
): ScoredDestination[] {
  const weights = buildWeights(preferences)
  const scored: ScoredDestination[] = []

  for (const entry of DESTINATION_CATALOG) {
    const result = scoreEntry(entry, grossMonthlyIncome, preferences, weights)
    if (result) scored.push(result)
  }

  scored.sort((a, b) => b.score - a.score || b.surplus - a.surplus)
  return scored
}

export function getTopRecommendations(
  preferences: WtrPreferences,
  grossMonthlyIncome: number,
  count: number,
  excludeKeys: Set<string> = new Set(),
): ScoredDestination[] {
  return scoreDestinations(preferences, grossMonthlyIncome)
    .filter((s) => !excludeKeys.has(s.key))
    .slice(0, count)
}

export function getScoreForKey(
  key: string,
  preferences: WtrPreferences,
  grossMonthlyIncome: number,
): ScoredDestination | undefined {
  const entry = DESTINATION_CATALOG.find((d) => d.key === key)
  if (!entry) return undefined
  const weights = buildWeights(preferences)
  return scoreEntry(entry, grossMonthlyIncome, preferences, weights) ?? undefined
}
