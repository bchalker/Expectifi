import {
  calculateMonthlyBudget,
  DEFAULT_LIFESTYLE,
  getAllMapCities,
  type MapCity,
} from '../../utils/costOfLiving'
import { regionFromCountry, type DestinationRegion } from './cityMapScoring'

/** Restraint end of the budget slider — belt-tightening vs projected income. */
export const BUDGET_SLIDER_MIN_MULTIPLIER = 0.6

/** Cushion end of the budget slider — plausible upside vs projected income. */
export const BUDGET_SLIDER_MAX_MULTIPLIER = 1.4

export const INCOME_EXPLORE_STEP = 50

function roundExplorationBound(value: number, mode: 'floor' | 'ceil'): number {
  if (mode === 'floor') {
    return Math.floor(value / INCOME_EXPLORE_STEP) * INCOME_EXPLORE_STEP
  }
  return Math.ceil(value / INCOME_EXPLORE_STEP) * INCOME_EXPLORE_STEP
}

/** Slider min scales with projected income (restraint end), stepped to $50. */
export function explorationIncomeMin(planMonthlyIncome: number): number {
  const income = Math.max(0, planMonthlyIncome)
  if (income <= 0) return 0
  return roundExplorationBound(income * BUDGET_SLIDER_MIN_MULTIPLIER, 'floor')
}

/** Slider max scales with projected income (cushion end), stepped to $50. */
export function explorationIncomeMax(planMonthlyIncome: number): number {
  const income = Math.max(0, planMonthlyIncome)
  if (income <= 0) return INCOME_EXPLORE_STEP
  const min = explorationIncomeMin(income)
  const max = roundExplorationBound(income * BUDGET_SLIDER_MAX_MULTIPLIER, 'ceil')
  return Math.max(max, min + INCOME_EXPLORE_STEP)
}

export function getTotalMapCityCount(): number {
  return getAllMapCities().length
}

export function incomeSliderPct(value: number, min: number, max: number): number {
  if (max <= min) return 0
  const clamped = Math.min(max, Math.max(min, value))
  return ((clamped - min) / (max - min)) * 100
}

const REGION_LABELS: Record<DestinationRegion, string> = {
  europe: 'Europe',
  'latin-america': 'Latin America',
  'southeast-asia': 'Southeast Asia',
  'eastern-europe': 'Eastern Europe',
  'middle-east-africa': 'Middle East & Africa',
}

export type BudgetExplorationStats = {
  totalWorldwide: number
  citiesInBudget: number
  shareOfAllPct: number
  cheapestBudget: number
  cheapestLabel: string
  bestSurplus: number
  topRegion: string | null
}

function cityLabel(city: MapCity): string {
  return `${city.city}, ${city.country}`
}

export function computeBudgetExplorationStats(monthlyIncome: number): BudgetExplorationStats {
  const all = getAllMapCities()
  const totalWorldwide = all.length

  const affordable = all
    .map((city) => ({
      city,
      monthlyBudget: calculateMonthlyBudget(city, DEFAULT_LIFESTYLE).total,
    }))
    .filter((row) => row.monthlyBudget <= monthlyIncome)

  const citiesInBudget = affordable.length
  const shareOfAllPct =
    totalWorldwide > 0 ? Math.round((citiesInBudget / totalWorldwide) * 100) : 0

  let cheapestBudget = 0
  let cheapestLabel = '—'
  let bestSurplus = 0
  let topRegion: string | null = null

  if (affordable.length > 0) {
    const cheapest = affordable.reduce((a, b) =>
      a.monthlyBudget < b.monthlyBudget ? a : b,
    )
    cheapestBudget = cheapest.monthlyBudget
    cheapestLabel = cityLabel(cheapest.city)
    bestSurplus = Math.max(0, monthlyIncome - cheapestBudget)

    const regionCounts = new Map<DestinationRegion, number>()
    for (const row of affordable) {
      const region = regionFromCountry(row.city.country)
      if (!region) continue
      regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
    }
    let top: DestinationRegion | null = null
    let topCount = 0
    for (const [region, count] of regionCounts) {
      if (count > topCount) {
        topCount = count
        top = region
      }
    }
    topRegion = top ? REGION_LABELS[top] : null
  }

  return {
    totalWorldwide,
    citiesInBudget,
    shareOfAllPct,
    cheapestBudget,
    cheapestLabel,
    bestSurplus,
    topRegion,
  }
}

export function clampExplorationIncome(
  value: number,
  planMonthlyIncome: number,
): number {
  const min = explorationIncomeMin(planMonthlyIncome)
  const max = explorationIncomeMax(planMonthlyIncome)
  const stepped = Math.round(value / INCOME_EXPLORE_STEP) * INCOME_EXPLORE_STEP
  return Math.min(max, Math.max(min, stepped))
}

export function defaultExplorationIncome(planMonthlyIncome: number): number {
  return planMonthlyIncome
}

export function isAtProjectedExplorationIncome(
  planMonthlyIncome: number,
  explorationIncome: number,
): boolean {
  return explorationIncome === planMonthlyIncome
}

/**
 * Income for map filtering and fit scores. At the projected slider position uses
 * exact plan income; when moved uses the stepped slider value.
 */
export function resolveExplorationIncome(
  planMonthlyIncome: number,
  explorationIncome: number,
): number {
  if (isAtProjectedExplorationIncome(planMonthlyIncome, explorationIncome)) {
    return planMonthlyIncome
  }
  return explorationIncome
}
