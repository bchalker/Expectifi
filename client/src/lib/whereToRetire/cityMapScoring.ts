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
  passesEnglishProficiencyMapFilter,
  type EnglishProficiencyFilter,
} from '../../utils/englishProficiency'
import {
  hasRetirementVisaProgram,
  passesForeignTaxMapFilter,
  type ForeignTaxFilter,
} from '../../utils/mapTaxVisaFilters'
import {
  passesDirectFlightsFilter,
  passesGoodAirFilter,
  passesHealthcareFilter,
  passesMaxFlightTimeFilter,
  passesMinRetirementScoreFilter,
  passesSafetyFilter,
  passesVisaFreeDaysFilter,
  type HealthcareFilter,
  type MaxFlightTimeFilter,
  type MinRetirementScoreFilter,
  type SafetyFilter,
  type VisaFreeDaysFilter,
} from '../../utils/mapDestinationFilters'

export type { ForeignTaxFilter }
export type {
  HealthcareFilter,
  MaxFlightTimeFilter,
  MinRetirementScoreFilter,
  SafetyFilter,
  VisaFreeDaysFilter,
} from '../../utils/mapDestinationFilters'
import {
  calculateRetirementScore,
  retirementScoreBandFromScore,
  type RetirementScoreBand,
  type RetirementScoreResult,
} from '../../utils/retirementScore'
import { buildRetirementIncomeFitExplanation } from './retirementIncomeFitScore'

export type { EnglishProficiencyFilter }

export type MatchTier = RetirementScoreBand

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

/** Toolbar preset for map geography (US / macro regions / worldwide). */
export type MapWhereToLook = 'us' | 'europe' | 'latin-america' | 'asia' | 'all'

export const WHERE_TO_LOOK_EUROPE_REGIONS: DestinationRegion[] = [
  'europe',
  'eastern-europe',
]

export const WHERE_TO_LOOK_ASIA_REGIONS: DestinationRegion[] = ['southeast-asia']

export const WHERE_TO_LOOK_LATIN_AMERICA_REGIONS: DestinationRegion[] = ['latin-america']

export const MAP_WHERE_TO_LOOK_OPTIONS: { id: MapWhereToLook; label: string }[] = [
  { id: 'us', label: 'US' },
  { id: 'europe', label: 'Europe' },
  { id: 'latin-america', label: 'Latin America' },
  { id: 'asia', label: 'Asia' },
  { id: 'all', label: 'All' },
]

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
  englishProficiency: EnglishProficiencyFilter
  foreignTax: ForeignTaxFilter
  retirementVisa: boolean
  medicareAccess: boolean
  /** When true, cities in travel-advisory countries are hidden. */
  hideAdvisories: boolean
  safety: SafetyFilter
  healthcare: HealthcareFilter
  goodAirOnly: boolean
  maxFlightTime: MaxFlightTimeFilter
  directFromUsOnly: boolean
  visaFreeDays: VisaFreeDaysFilter
  minRetirementScore: MinRetirementScoreFilter
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  fitsMyIncome: false,
  regions: [...ALL_DESTINATION_REGIONS],
  climate: 'any',
  regionScope: 'both',
  sortBy: 'affordability-fit',
  englishProficiency: 'any',
  foreignTax: 'any',
  retirementVisa: false,
  medicareAccess: false,
  hideAdvisories: false,
  safety: 'any',
  healthcare: 'any',
  goodAirOnly: false,
  maxFlightTime: 'any',
  directFromUsOnly: false,
  visaFreeDays: 'any',
  minRetirementScore: 'any',
}

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
  if (!passesEnglishProficiencyMapFilter(country, filters.englishProficiency)) {
    return false
  }
  if (!passesForeignTaxMapFilter(country, filters.foreignTax)) {
    return false
  }
  if (filters.retirementVisa && !hasRetirementVisaProgram(country)) {
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
      return b.retirementScore - a.retirementScore
  }
}

export type ScoredMapCity = {
  city: MapCity
  monthlyBudget: number
  score: RetirementScoreResult
  retirementScore: number
  displayScore: number
  incomeFitScore: number
  qolNormalized: number
  warnings: string[]
  band: RetirementScoreBand
  bandColor: string
  bandLabel: string
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
  return retirementScoreBandFromScore(score).band
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
  const score = calculateRetirementScore(monthlyIncome, monthlyBudget, null, city.country)

  return {
    city,
    monthlyBudget,
    score,
    retirementScore: score.rawRetirementScore,
    displayScore: score.displayScore,
    incomeFitScore: score.incomeFitScore,
    qolNormalized: score.qolNormalized,
    warnings: score.warnings,
    band: score.band,
    bandColor: score.bandColor,
    bandLabel: score.bandLabel,
    tier: score.band,
    pinSizePx: pinSizeForScore(score.displayScore),
    colExplanation: buildRetirementIncomeFitExplanation(
      monthlyIncome,
      score.incomeFitScore,
    ),
  }
}

/** @deprecated Use countVisibleMapCities — kept for call-site clarity. */
export function countFitsIncomeWithFilters(
  monthlyIncome: number,
  filters: MapFilters,
): number {
  return countVisibleMapCities(monthlyIncome, filters)
}

export function regionsAreDefault(regions: DestinationRegion[]): boolean {
  if (regions.length !== ALL_DESTINATION_REGIONS.length) return false
  return ALL_DESTINATION_REGIONS.every((r) => regions.includes(r))
}

function regionsMatchPreset(
  regions: DestinationRegion[],
  preset: readonly DestinationRegion[],
): boolean {
  if (regions.length !== preset.length) return false
  return preset.every((r) => regions.includes(r))
}

export function resolveWhereToLook(filters: MapFilters): MapWhereToLook {
  if (filters.regionScope === 'us-only') return 'us'
  if (regionsMatchPreset(filters.regions, WHERE_TO_LOOK_LATIN_AMERICA_REGIONS)) {
    return 'latin-america'
  }
  if (regionsMatchPreset(filters.regions, WHERE_TO_LOOK_ASIA_REGIONS)) return 'asia'
  if (regionsMatchPreset(filters.regions, WHERE_TO_LOOK_EUROPE_REGIONS)) return 'europe'
  return 'all'
}

export function applyWhereToLook(filters: MapFilters, choice: MapWhereToLook): MapFilters {
  switch (choice) {
    case 'us':
      return {
        ...filters,
        regionScope: 'us-only',
        regions: [...ALL_DESTINATION_REGIONS],
      }
    case 'europe':
      return {
        ...filters,
        regionScope: 'international-only',
        regions: [...WHERE_TO_LOOK_EUROPE_REGIONS],
        medicareAccess: false,
      }
    case 'latin-america':
      return {
        ...filters,
        regionScope: 'international-only',
        regions: [...WHERE_TO_LOOK_LATIN_AMERICA_REGIONS],
        medicareAccess: false,
      }
    case 'asia':
      return {
        ...filters,
        regionScope: 'international-only',
        regions: [...WHERE_TO_LOOK_ASIA_REGIONS],
        medicareAccess: false,
      }
    case 'all':
      return {
        ...filters,
        regionScope: 'both',
        regions: [...ALL_DESTINATION_REGIONS],
        medicareAccess: false,
      }
  }
}

export function countActiveMapFilters(filters: MapFilters): number {
  let count = 0
  if (resolveWhereToLook(filters) !== 'all') count += 1
  else if (!regionsAreDefault(filters.regions)) count += 1
  else if (filters.regionScope !== 'both') count += 1
  if (filters.climate !== 'any') count += 1
  if (filters.sortBy !== 'affordability-fit') count += 1
  if (filters.englishProficiency !== 'any') count += 1
  if (filters.foreignTax !== 'any') count += 1
  if (filters.retirementVisa) count += 1
  if (filters.medicareAccess) count += 1
  if (filters.hideAdvisories) count += 1
  if (filters.safety !== 'any') count += 1
  if (filters.healthcare !== 'any') count += 1
  if (filters.goodAirOnly) count += 1
  if (filters.maxFlightTime !== 'any') count += 1
  if (filters.directFromUsOnly) count += 1
  if (filters.visaFreeDays !== 'any') count += 1
  if (filters.minRetirementScore !== 'any') count += 1
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
    filters.englishProficiency,
    filters.foreignTax,
    filters.retirementVisa ? '1' : '0',
    filters.medicareAccess ? '1' : '0',
    filters.hideAdvisories ? '1' : '0',
    filters.safety,
    filters.healthcare,
    filters.goodAirOnly ? '1' : '0',
    filters.maxFlightTime,
    filters.directFromUsOnly ? '1' : '0',
    filters.visaFreeDays,
    filters.minRetirementScore,
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

  if (!passesSafetyFilter(city.country, filters.safety)) return false
  if (!passesHealthcareFilter(city.country, filters.healthcare)) return false
  if (!passesGoodAirFilter(city.country, filters.goodAirOnly)) return false
  if (!passesMaxFlightTimeFilter(city.country, filters.maxFlightTime)) return false
  if (!passesDirectFlightsFilter(city.country, filters.directFromUsOnly)) return false
  if (!passesVisaFreeDaysFilter(city.country, filters.visaFreeDays)) return false
  if (!passesMinRetirementScoreFilter(scored.retirementScore, filters.minRetirementScore)) {
    return false
  }

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

/** Cities at or below income with optional map filters. */
export function countVisibleMapCities(
  monthlyIncome: number,
  filters: MapFilters,
): number {
  return scoreAndFilterMapCities(monthlyIncome, filters).length
}
