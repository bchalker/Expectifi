import { getCountryTaxEntry } from '../../data/countryTaxRates'
import { getHealthcareRating } from '../../data/destinationHealthcare'
import { getTeleportFallback } from '../../data/teleportFallbacks'
import { readApiCache } from '../api/apiCache'
import type { DollarStrengthSeries } from '../api/exchangeRates'
import {
  calculateMonthlyBudget,
  countryToIsoCode,
  getAllMapCities,
  hasTravelAdvisory,
  type MapCity,
} from '../../utils/costOfLiving'
import {
  buildRetirementIncomeFitExplanation,
  calculateRetirementIncomeFitScore,
  matchRetirementIncomeFitTier,
  type RetirementIncomeFitTier,
} from './retirementIncomeFitScore'

export type MatchTier = RetirementIncomeFitTier

export type ClimateFilter =
  | 'any'
  | 'warm-year-round'
  | 'mediterranean'
  | 'tropical'
  | 'four-seasons'

export type DestinationRegion =
  | 'europe'
  | 'latin-america'
  | 'southeast-asia'
  | 'eastern-europe'
  | 'middle-east-africa'

export const ALL_DESTINATION_REGIONS: DestinationRegion[] = [
  'europe',
  'latin-america',
  'southeast-asia',
  'eastern-europe',
  'middle-east-africa',
]

export type MapRegionScope = 'us-only' | 'international-only' | 'both'

export type MapSortBy =
  | 'affordability-fit'
  | 'lowest-budget'
  | 'highest-surplus'
  | 'quality-of-life'
  | 'healthcare-access'
  | 'dollar-strength'

export type MapFilters = {
  fitsMyIncome: boolean
  regions: DestinationRegion[]
  climate: ClimateFilter
  regionScope: MapRegionScope
  sortBy: MapSortBy
  englishSpeaking: boolean
  medicareAccess: boolean
  /** When true, cities in travel-advisory countries are hidden. */
  hideAdvisories: boolean
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  fitsMyIncome: false,
  regions: [...ALL_DESTINATION_REGIONS],
  climate: 'any',
  regionScope: 'both',
  sortBy: 'affordability-fit',
  englishSpeaking: false,
  medicareAccess: false,
  hideAdvisories: false,
}

const ENGLISH_SPEAKING_COUNTRIES = new Set([
  'United Kingdom',
  'Ireland',
  'Australia',
  'New Zealand',
  'Canada',
  'Costa Rica',
])

const US_COUNTRY = 'United States'

function countryCatalogKey(country: string): string | null {
  const iso = countryToIsoCode(country)
  return iso ? `country:${iso}` : null
}

function teleportSlugForCountry(country: string): string {
  const iso = countryToIsoCode(country)
  if (!iso) return ''
  return getCountryTaxEntry(iso)?.teleportSlug ?? ''
}

function qolScoreForCountry(country: string): number {
  const slug = teleportSlugForCountry(country)
  return getTeleportFallback(slug).qol
}

function healthcareScoreForCountry(country: string): number {
  const key = countryCatalogKey(country)
  return key ? getHealthcareRating(key) : 70
}

function dollarTrendForCountry(country: string): number {
  const iso = countryToIsoCode(country)
  if (!iso) return 0
  const entry = getCountryTaxEntry(iso)
  if (!entry || entry.currencyCode === 'USD') return 0
  const cached = readApiCache<DollarStrengthSeries>(
    'exchangerate',
    `usd-v2-${entry.currencyCode.toUpperCase()}`,
  )
  return cached?.trendPct ?? 0
}

function passesRegionScope(country: string, scope: MapRegionScope): boolean {
  if (scope === 'both') return true
  if (scope === 'us-only') return country === US_COUNTRY
  return country !== US_COUNTRY
}

function passesMapDealbreakers(country: string, filters: MapFilters): boolean {
  if (filters.englishSpeaking && !ENGLISH_SPEAKING_COUNTRIES.has(country)) {
    return false
  }
  if (filters.medicareAccess && country !== US_COUNTRY) {
    return false
  }
  return true
}

function compareMapCities(a: ScoredMapCity, b: ScoredMapCity, sortBy: MapSortBy, monthlyIncome: number): number {
  switch (sortBy) {
    case 'lowest-budget':
      return a.monthlyBudget - b.monthlyBudget
    case 'highest-surplus':
      return (monthlyIncome - b.monthlyBudget) - (monthlyIncome - a.monthlyBudget)
    case 'quality-of-life':
      return qolScoreForCountry(b.city.country) - qolScoreForCountry(a.city.country)
    case 'healthcare-access':
      return healthcareScoreForCountry(b.city.country) - healthcareScoreForCountry(a.city.country)
    case 'dollar-strength':
      return dollarTrendForCountry(b.city.country) - dollarTrendForCountry(a.city.country)
    case 'affordability-fit':
    default:
      return b.affordabilityScore - a.affordabilityScore
  }
}

export type ScoredMapCity = {
  city: MapCity
  monthlyBudget: number
  affordabilityScore: number
  tier: MatchTier
  pinSizePx: number
  colExplanation: string
}

const EUROPE = new Set([
  'Portugal', 'Spain', 'Italy', 'France', 'Germany', 'Greece', 'Croatia',
  'Hungary', 'Czech Republic', 'Poland', 'Estonia', 'Latvia', 'Lithuania',
  'Slovenia', 'Slovakia', 'Romania', 'Bulgaria', 'Serbia', 'Montenegro',
  'Albania', 'North Macedonia', 'Georgia', 'Armenia', 'Turkey',
])

const LATIN_AMERICA = new Set([
  'Mexico', 'Colombia', 'Panama', 'Costa Rica', 'Ecuador', 'Peru', 'Uruguay',
  'Argentina', 'Brazil', 'Chile', 'Dominican Republic',
])

const SOUTHEAST_ASIA = new Set([
  'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Philippines', 'Cambodia',
  'Myanmar',
])

const EASTERN_EUROPE = new Set([
  'Ukraine', 'Moldova', 'Belarus', 'Russia', 'Kazakhstan', 'Uzbekistan',
  'Azerbaijan',
])

const MIDDLE_EAST_AFRICA = new Set([
  'Morocco', 'Egypt', 'Jordan', 'United Arab Emirates', 'South Africa',
  'Kenya', 'Tunisia', 'Lebanon',
])

const WARM_YEAR_ROUND = new Set([
  'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Vietnam', 'Cambodia',
  'Colombia', 'Ecuador', 'Panama', 'Costa Rica',
])

const MEDITERRANEAN = new Set([
  'Portugal', 'Spain', 'Italy', 'Greece', 'Croatia', 'Montenegro', 'Morocco',
  'Turkey',
])

const FOUR_SEASONS = new Set([
  'Germany', 'Czech Republic', 'Poland', 'Hungary', 'Estonia', 'Latvia',
  'Lithuania', 'Romania', 'Bulgaria', 'Serbia', 'Ukraine', 'Russia',
])

export function matchTier(score: number): MatchTier {
  return matchRetirementIncomeFitTier(score)
}

export function pinSizeForScore(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return Math.round(10 + (clamped / 100) * 14)
}

export function regionFromCountry(country: string): DestinationRegion | null {
  if (EUROPE.has(country)) return 'europe'
  if (LATIN_AMERICA.has(country)) return 'latin-america'
  if (SOUTHEAST_ASIA.has(country)) return 'southeast-asia'
  if (EASTERN_EUROPE.has(country)) return 'eastern-europe'
  if (MIDDLE_EAST_AFRICA.has(country)) return 'middle-east-africa'
  return null
}

function climateFromCountry(country: string): ClimateFilter | null {
  if (WARM_YEAR_ROUND.has(country)) return 'warm-year-round'
  if (MEDITERRANEAN.has(country)) return 'mediterranean'
  if (FOUR_SEASONS.has(country)) return 'four-seasons'
  return null
}

function passesClimate(country: string, climate: ClimateFilter): boolean {
  if (climate === 'any') return true
  const cityClimate = climateFromCountry(country)
  if (!cityClimate) return false
  if (climate === 'tropical') {
    return cityClimate === 'warm-year-round'
  }
  return cityClimate === climate
}

export function scoreMapCity(city: MapCity, monthlyIncome: number): ScoredMapCity {
  const monthlyBudget = calculateMonthlyBudget(city)
  const affordabilityScore = calculateRetirementIncomeFitScore(monthlyIncome, monthlyBudget)

  return {
    city,
    monthlyBudget,
    affordabilityScore,
    tier: matchTier(affordabilityScore),
    pinSizePx: pinSizeForScore(affordabilityScore),
    colExplanation: buildRetirementIncomeFitExplanation(monthlyIncome, affordabilityScore),
  }
}

/** @deprecated Use countVisibleMapCities — kept for call-site clarity. */
export function countFitsIncomeWithFilters(monthlyIncome: number, filters: MapFilters): number {
  return countVisibleMapCities(monthlyIncome, filters)
}

export function regionsAreDefault(regions: DestinationRegion[]): boolean {
  if (regions.length !== ALL_DESTINATION_REGIONS.length) return false
  return ALL_DESTINATION_REGIONS.every((r) => regions.includes(r))
}

export function countActiveMapFilters(filters: MapFilters): number {
  let count = 0
  if (!regionsAreDefault(filters.regions)) count += 1
  if (filters.climate !== 'any') count += 1
  if (filters.regionScope !== 'both') count += 1
  if (filters.sortBy !== 'affordability-fit') count += 1
  if (filters.englishSpeaking) count += 1
  if (filters.medicareAccess) count += 1
  if (filters.hideAdvisories) count += 1
  return count
}

export function hasNonDefaultMapFilters(filters: MapFilters): boolean {
  return countActiveMapFilters(filters) > 0
}

export function mapFiltersKey(filters: MapFilters): string {
  return [
    filters.fitsMyIncome ? '1' : '0',
    filters.climate,
    [...filters.regions].sort().join(','),
    filters.regionScope,
    filters.sortBy,
    filters.englishSpeaking ? '1' : '0',
    filters.medicareAccess ? '1' : '0',
    filters.hideAdvisories ? '1' : '0',
  ].join('|')
}

export function passesMapFilters(
  scored: ScoredMapCity,
  filters: MapFilters,
  monthlyIncome: number,
): boolean {
  const { city, monthlyBudget } = scored

  if (monthlyBudget > monthlyIncome) return false

  // Continent buckets exclude the US — only when user narrows regions (not "all regions")
  if (!regionsAreDefault(filters.regions) && city.country !== US_COUNTRY) {
    const region = regionFromCountry(city.country)
    if (!region || !filters.regions.includes(region)) return false
  }

  if (!passesClimate(city.country, filters.climate)) return false

  if (!passesRegionScope(city.country, filters.regionScope)) return false

  if (!passesMapDealbreakers(city.country, filters)) return false

  if (filters.hideAdvisories && hasTravelAdvisory(city.country)) return false

  return true
}

export function scoreAndFilterMapCities(
  monthlyIncome: number,
  filters: MapFilters,
  limit?: number,
): ScoredMapCity[] {
  const scored = getAllMapCities()
    .map((city) => scoreMapCity(city, monthlyIncome))
    .filter((item) => passesMapFilters(item, filters, monthlyIncome))
    .sort((a, b) => compareMapCities(a, b, filters.sortBy, monthlyIncome))

  return limit != null ? scored.slice(0, limit) : scored
}

/** Cities at or below income with optional map filters (income always enforced). */
export function countVisibleMapCities(
  monthlyIncome: number,
  filters: MapFilters,
): number {
  return scoreAndFilterMapCities(monthlyIncome, filters).length
}
