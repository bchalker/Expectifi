import { findOnboardingRegion, type OnboardingRegionId } from '../onboardingRegions'
import { getFlagEmoji } from '../regionUtils'
import { countryToIsoCode, getAllMapCities } from '../../utils/costOfLiving'
import {
  DEFAULT_MAP_FILTERS,
  scoreAndFilterMapCities,
  type ScoredMapCity,
} from './cityMapScoring'
import { getExcludedCountries } from '../retirementStorage'
import { getUsCityStateAbbr } from './usCityStateAbbr'
import type { RetirementScoreBand } from '../../utils/retirementScore'

const PREVIEW_MAP_BANDS = new Set<RetirementScoreBand>(['excellent', 'strong', 'moderate'])

const PREVIEW_MAP_FILTERS = {
  ...DEFAULT_MAP_FILTERS,
  sortBy: 'affordability-fit' as const,
}

export type IncomeHarvestCityRow = {
  rank: number
  city: string
  country: string
  label: string
  flag: string
  score: number
}

export type IncomeHarvestContextParagraph =
  | {
      kind: 'abroad'
      topCityLabel: string
      scoreDelta: number
    }
  | { kind: 'competitive' }
  | {
      kind: 'international'
      monthlyIncome: number
    }

export type IncomeHarvestPreviewData = {
  dataReady: boolean
  mapDestinations: ScoredMapCity[]
  worldwideTop: IncomeHarvestCityRow[]
  homeTop: IncomeHarvestCityRow[]
  homeCountryLabel: string
  homeSectionHidden: boolean
  qualifyingCount: number
  contextParagraph: IncomeHarvestContextParagraph | null
}

export function formatIncomeHarvestCityLabel(city: string, country: string): string {
  const trimmedCity = city.trim()
  const trimmedCountry = country.trim()

  if (trimmedCity.toLowerCase() === trimmedCountry.toLowerCase()) {
    return trimmedCity
  }

  if (trimmedCountry === 'United States') {
    const stateAbbr = getUsCityStateAbbr(trimmedCity)
    return stateAbbr ? `${trimmedCity}, ${stateAbbr}` : trimmedCity
  }

  return `${trimmedCity}, ${trimmedCountry}`
}

function isPreviewMapCity(scored: ScoredMapCity): boolean {
  return PREVIEW_MAP_BANDS.has(scored.band)
}

function toCityRow(scored: ScoredMapCity, rank: number): IncomeHarvestCityRow {
  const iso = countryToIsoCode(scored.city.country)
  return {
    rank,
    city: scored.city.city,
    country: scored.city.country,
    label: formatIncomeHarvestCityLabel(scored.city.city, scored.city.country),
    flag: iso ? getFlagEmoji(iso) : '',
    score: scored.displayScore,
  }
}

function homeCountryName(locale: OnboardingRegionId): string {
  return findOnboardingRegion(locale)?.country ?? 'United States'
}

function qualifyingAtIncome(monthlyIncome: number): ScoredMapCity[] {
  return scoreAndFilterMapCities(
    monthlyIncome,
    PREVIEW_MAP_FILTERS,
    undefined,
    getExcludedCountries(),
  )
}

export function homeCountrySectionTitle(country: string): string {
  return `In the ${country}`
}

function buildContextParagraph(args: {
  monthlyIncome: number
  worldwideTop: IncomeHarvestCityRow[]
  homeTop: IncomeHarvestCityRow[]
  homeSectionHidden: boolean
}): IncomeHarvestContextParagraph | null {
  const { monthlyIncome, worldwideTop, homeTop, homeSectionHidden } = args

  if (worldwideTop.length === 0) return null

  if (homeSectionHidden) {
    return {
      kind: 'international',
      monthlyIncome,
    }
  }

  const worldwideBest = worldwideTop[0]?.score ?? 0
  const homeBest = homeTop[0]?.score ?? 0
  const scoreDelta = worldwideBest - homeBest

  if (scoreDelta > 5) {
    return {
      kind: 'abroad',
      topCityLabel: worldwideTop[0].label,
      scoreDelta: Math.round(scoreDelta),
    }
  }

  return { kind: 'competitive' }
}

export function computeIncomeHarvestPreview(
  monthlyIncome: number,
  locale: OnboardingRegionId,
): IncomeHarvestPreviewData {
  const allCities = getAllMapCities()
  if (allCities.length === 0 || monthlyIncome <= 0) {
    return {
      dataReady: false,
      mapDestinations: [],
      worldwideTop: [],
      homeTop: [],
      homeCountryLabel: homeCountryName(locale),
      homeSectionHidden: true,
      qualifyingCount: 0,
      contextParagraph: null,
    }
  }

  const qualifying = qualifyingAtIncome(monthlyIncome)
  const qualifyingCount = qualifying.length

  const mapDestinations = qualifying.filter(isPreviewMapCity).slice(0, 30)

  const worldwideTop = qualifying
    .slice(0, 3)
    .map((item, i) => toCityRow(item, i + 1))

  const homeName = homeCountryName(locale)
  const homeQualifying = qualifying.filter((item) => item.city.country === homeName)
  const homeSectionHidden = homeQualifying.length === 0
  const homeTop = homeQualifying.slice(0, 3).map((item, i) => toCityRow(item, i + 1))

  const contextParagraph = buildContextParagraph({
    monthlyIncome,
    worldwideTop,
    homeTop,
    homeSectionHidden,
  })

  return {
    dataReady: true,
    mapDestinations,
    worldwideTop,
    homeTop,
    homeCountryLabel: homeName,
    homeSectionHidden,
    qualifyingCount,
    contextParagraph,
  }
}
