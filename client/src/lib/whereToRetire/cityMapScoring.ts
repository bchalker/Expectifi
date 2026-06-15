import { getCountryTaxEntry } from '../../data/countryTaxRates'
import { getHealthcareRating } from '../../data/destinationHealthcare'
import { getTeleportFallback } from '../../data/teleportFallbacks'
import { readApiCache } from '../api/apiCache'
import type { DollarStrengthSeries } from '../api/exchangeRates'
import { getCityClimateNormals } from '../../utils/climateNormals'
import {
  buildLifestyleInputs,
  calculateMonthlyBudget,
  countryToIsoCode,
  DEFAULT_BUDGET_PREFERENCES,
  DEFAULT_LIFESTYLE,
  getAllMapCities,
  hasTravelAdvisory,
  type BudgetPreferences,
  type LifestyleInputs,
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
  type SafetyFilter,
  type VisaFreeDaysFilter,
  type DirectFlightOrigin,
} from '../../utils/mapDestinationFilters'
import {
  EXPAT_LEGEND_TIER_IDS,
  type ExpatLegendTierId,
} from './mapPinDisplay'
import { expatCommunityPinTier } from '../../utils/expatInfo'
import {
  resolveRetirementPreferences,
  type RetirementPreferences,
} from './preferences'

export type { ForeignTaxFilter }
export type {
  DirectFlightOrigin,
  HealthcareFilter,
  MaxFlightTimeFilter,
  SafetyFilter,
  VisaFreeDaysFilter,
} from '../../utils/mapDestinationFilters'
export { DIRECT_FLIGHT_ORIGIN_OPTIONS } from './directFlightOrigins'
import {
  calculateRetirementScore,
  retirementScoreBandFromScore,
  type RetirementScoreBand,
  type RetirementScoreResult,
} from '../../utils/retirementScore'
import { buildRetirementIncomeFitExplanation } from './retirementIncomeFitScore'
import { monthlyOutflowForMapCity, passesVisaQualifyingMapFilter } from './mapIncomeFit'
import { isoRegionToDestinationRegion } from '../regionUtils'
import { getExcludedCountries } from '../retirementStorage'
import {
  passesWhereToLookCountry,
  type MapWhereToLook,
} from './whereToLookCountries'

export type { BudgetPreferences, LifestyleInputs } from '../../utils/costOfLiving'
export {
  DEFAULT_BUDGET_PREFERENCES,
  DEFAULT_LIFESTYLE,
  buildLifestyleInputs,
} from '../../utils/costOfLiving'

export type { MapWhereToLook } from './whereToLookCountries'
export { MAP_WHERE_TO_LOOK_OPTIONS } from './whereToLookCountries'

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
  whereToLook: MapWhereToLook
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
  /** Departure country when `directFromUsOnly` is enabled. */
  directFlightOrigin: DirectFlightOrigin
  visaFreeDays: VisaFreeDaysFilter
  /** Minimum retirement fit score (0 = any). */
  minRetirementScore: number
  /** User-facing budget panel preferences (lifestyle is derived). */
  budgetPreferences: BudgetPreferences
  /** Lifestyle inputs for monthly budget and income-fit scoring (derived). */
  lifestyle?: LifestyleInputs
  /** Only cities that meet visa income rules in the income-fit model. */
  visaQualifyingOnly: boolean
  /** Active expat community size tiers (expat pin view legend filter). */
  expatCommunityTiers: ExpatLegendTierId[]
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  fitsMyIncome: false,
  regions: [...ALL_DESTINATION_REGIONS],
  whereToLook: 'all',
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
  directFlightOrigin: 'us',
  visaFreeDays: 'any',
  minRetirementScore: 0,
  budgetPreferences: DEFAULT_BUDGET_PREFERENCES,
  lifestyle: DEFAULT_LIFESTYLE,
  visaQualifyingOnly: false,
  expatCommunityTiers: [...EXPAT_LEGEND_TIER_IDS],
}

export type { ExpatLegendTierId } from './mapPinDisplay'
export { EXPAT_LEGEND_TIER_IDS } from './mapPinDisplay'

export function isDefaultExpatCommunityTiers(
  tiers: readonly ExpatLegendTierId[],
): boolean {
  return (
    tiers.length === EXPAT_LEGEND_TIER_IDS.length &&
    EXPAT_LEGEND_TIER_IDS.every((tier) => tiers.includes(tier))
  )
}

export function toggleExpatCommunityTier(
  tiers: ExpatLegendTierId[],
  tier: ExpatLegendTierId,
): ExpatLegendTierId[] {
  if (tiers.includes(tier)) {
    if (tiers.length <= 1) return [...EXPAT_LEGEND_TIER_IDS]
    return tiers.filter((t) => t !== tier)
  }
  return [...tiers, tier].sort(
    (a, b) =>
      EXPAT_LEGEND_TIER_IDS.indexOf(a) - EXPAT_LEGEND_TIER_IDS.indexOf(b),
  )
}

function passesExpatCommunityTierMapFilter(
  country: string,
  activeTiers: ExpatLegendTierId[],
): boolean {
  if (isDefaultExpatCommunityTiers(activeTiers)) return true
  const tier = expatCommunityPinTier(country)
  if (tier === 'domestic' || tier === 'none') return false
  return activeTiers.includes(tier)
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

export function resolveMapLifestyle(filters: {
  budgetPreferences?: BudgetPreferences
  lifestyle?: LifestyleInputs
}): LifestyleInputs {
  if (filters.budgetPreferences) {
    return buildLifestyleInputs(filters.budgetPreferences)
  }
  return filters.lifestyle ?? DEFAULT_LIFESTYLE
}

export function applyMapFiltersBudgetPreferences(
  filters: MapFilters,
  budgetPreferences: BudgetPreferences,
): MapFilters {
  return {
    ...filters,
    budgetPreferences,
    lifestyle: buildLifestyleInputs(budgetPreferences),
  }
}

function compareMapCities(
  a: ScoredMapCity,
  b: ScoredMapCity,
  sortBy: MapSortBy,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'lifestyle'>,
): number {
  switch (sortBy) {
    case 'lowest-budget':
      return (
        monthlyOutflowForMapCity(a, monthlyIncome, filters) -
        monthlyOutflowForMapCity(b, monthlyIncome, filters)
      )
    case 'highest-surplus':
      return (
        monthlyIncome -
        monthlyOutflowForMapCity(b, monthlyIncome, filters) -
        (monthlyIncome - monthlyOutflowForMapCity(a, monthlyIncome, filters))
      )
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
  const iso = countryToIsoCode(country)
  if (!iso) return null
  return isoRegionToDestinationRegion(iso)
}

export function isCityExcludedByCountry(
  country: string,
  excludedCountries: string[],
): boolean {
  return excludedCountries.includes(country)
}

export function passesExclusionFilters(
  city: MapCity,
  excludedCountries: string[],
): boolean {
  return !isCityExcludedByCountry(city.country, excludedCountries)
}

export type MapCityVisibilityCounts = {
  totalCities: number
  visibleCount: number
  visibleCountryCount: number
  excludedByCountryCount: number
}

export function countMapCityVisibility(
  monthlyIncome: number,
  filters: MapFilters,
  excludedCountries: string[] = getExcludedCountries(),
): MapCityVisibilityCounts {
  const all = getAllMapCities()
  let visibleCount = 0
  let excludedByCountryCount = 0
  const visibleCountries = new Set<string>()

  for (const city of all) {
    if (isCityExcludedByCountry(city.country, excludedCountries)) {
      excludedByCountryCount += 1
      continue
    }
    const scored = scoreMapCity(city, monthlyIncome, {
      prefs: resolveRetirementPreferences(),
      lifestyle: resolveMapLifestyle(filters),
    })
    if (passesMapFilters(scored, filters, monthlyIncome)) {
      visibleCount += 1
      visibleCountries.add(city.country)
    }
  }

  return {
    totalCities: all.length,
    visibleCount,
    visibleCountryCount: visibleCountries.size,
    excludedByCountryCount,
  }
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

export type ScoreMapCityOptions = {
  prefs?: RetirementPreferences
  lifestyle?: LifestyleInputs
}

export function monthlyBudgetForScoring(
  city: MapCity,
  lifestyle: LifestyleInputs = DEFAULT_LIFESTYLE,
): number {
  return calculateMonthlyBudget(city, lifestyle).total
}

export function scoreMapCity(
  city: MapCity,
  monthlyIncome: number,
  options?: ScoreMapCityOptions,
): ScoredMapCity {
  const prefs = options?.prefs ?? resolveRetirementPreferences()
  const lifestyle = options?.lifestyle ?? DEFAULT_LIFESTYLE
  const monthlyBudget = monthlyBudgetForScoring(city, lifestyle)
  const score = calculateRetirementScore(
    monthlyIncome,
    monthlyBudget,
    city,
    city.country,
    prefs,
    { climate: getCityClimateNormals(city.city, city.country) },
  )

  return {
    city,
    monthlyBudget,
    score,
    retirementScore: score.retirementScore,
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

export function resolveWhereToLook(filters: MapFilters): MapWhereToLook {
  return filters.whereToLook
}

export function applyWhereToLook(filters: MapFilters, choice: MapWhereToLook): MapFilters {
  const base = {
    ...filters,
    whereToLook: choice,
    regions: [...ALL_DESTINATION_REGIONS],
  }

  switch (choice) {
    case 'us':
      return {
        ...base,
        regionScope: 'us-only',
      }
    case 'all':
      return {
        ...base,
        regionScope: 'both',
        medicareAccess: false,
      }
    default:
      return {
        ...base,
        regionScope: 'international-only',
        medicareAccess: false,
      }
  }
}

export function countActiveMapFilters(filters: MapFilters): number {
  let count = 0
  if (filters.whereToLook !== 'all') count += 1
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
  if (filters.minRetirementScore > 0) count += 1
  if (filters.visaQualifyingOnly) count += 1
  if (!isDefaultExpatCommunityTiers(filters.expatCommunityTiers)) count += 1
  return count
}

export function hasNonDefaultMapFilters(filters: MapFilters): boolean {
  return countActiveMapFilters(filters) > 0
}

export function mapFiltersKey(filters: MapFilters): string {
  return [
    filters.fitsMyIncome ? '1' : '0',
    filters.whereToLook,
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
    filters.directFlightOrigin,
    filters.visaFreeDays,
    String(filters.minRetirementScore),
    JSON.stringify(filters.budgetPreferences),
    filters.visaQualifyingOnly ? '1' : '0',
    [...filters.expatCommunityTiers].sort().join(','),
  ].join('|')
}

export function passesMapFilters(
  scored: ScoredMapCity,
  filters: MapFilters,
  monthlyIncome: number,
): boolean {
  const { city } = scored
  const monthlyOutflow = monthlyOutflowForMapCity(scored, monthlyIncome, filters)

  if (monthlyOutflow > monthlyIncome) return false

  if (!passesVisaQualifyingMapFilter(scored, monthlyIncome, filters)) return false

  if (!passesWhereToLookCountry(city.country, filters.whereToLook)) return false

  if (!passesClimate(city.country, filters.climate)) return false

  if (filters.whereToLook === 'all' && !passesRegionScope(city.country, filters.regionScope)) {
    return false
  }

  if (!passesMapDealbreakers(city.country, filters)) return false

  if (filters.hideAdvisories && hasTravelAdvisory(city.country)) return false

  if (!passesSafetyFilter(city.country, filters.safety)) return false
  if (!passesHealthcareFilter(city.country, filters.healthcare)) return false
  if (!passesGoodAirFilter(city.country, filters.goodAirOnly)) return false
  if (!passesMaxFlightTimeFilter(city.country, filters.maxFlightTime)) return false
  if (
    !passesDirectFlightsFilter(
      city.country,
      filters.directFromUsOnly,
      filters.directFlightOrigin,
    )
  ) {
    return false
  }
  if (!passesVisaFreeDaysFilter(city.country, filters.visaFreeDays)) return false
  if (!passesMinRetirementScoreFilter(scored.retirementScore, filters.minRetirementScore)) {
    return false
  }

  if (!passesExpatCommunityTierMapFilter(city.country, filters.expatCommunityTiers)) {
    return false
  }

  return true
}

export function scoreAndFilterMapCities(
  monthlyIncome: number,
  filters: MapFilters,
  limit?: number,
  excludedCountries: string[] = getExcludedCountries(),
  prefs?: RetirementPreferences,
): ScoredMapCity[] {
  const resolvedPrefs = prefs ?? resolveRetirementPreferences()
  const scoreOptions: ScoreMapCityOptions = {
    prefs: resolvedPrefs,
    lifestyle: resolveMapLifestyle(filters),
  }
  const scored = getAllMapCities()
    .filter((city) => passesExclusionFilters(city, excludedCountries))
    .map((city) => scoreMapCity(city, monthlyIncome, scoreOptions))
    .filter((item) => passesMapFilters(item, filters, monthlyIncome))
    .sort((a, b) => compareMapCities(a, b, filters.sortBy, monthlyIncome, filters))

  return limit != null ? scored.slice(0, limit) : scored
}

/** Cities at or below income with optional map filters. */
export function countVisibleMapCities(
  monthlyIncome: number,
  filters: MapFilters,
  excludedCountries?: string[],
): number {
  return scoreAndFilterMapCities(
    monthlyIncome,
    filters,
    undefined,
    excludedCountries,
  ).length
}
