import {
  calculateMonthlyBudget,
  getAllMapCities,
  type MapCity,
} from '../../utils/costOfLiving'
import { regionFromCountry, type DestinationRegion } from './cityMapScoring'

export const INCOME_EXPLORE_MIN = 0
export const INCOME_EXPLORE_MAX = 8_000
export const INCOME_EXPLORE_STEP = 50

export function getTotalMapCityCount(): number {
  return getAllMapCities().length
}

export function incomeSliderPct(value: number): number {
  if (INCOME_EXPLORE_MAX <= INCOME_EXPLORE_MIN) return 0
  const clamped = Math.min(INCOME_EXPLORE_MAX, Math.max(INCOME_EXPLORE_MIN, value))
  return ((clamped - INCOME_EXPLORE_MIN) / (INCOME_EXPLORE_MAX - INCOME_EXPLORE_MIN)) * 100
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
      monthlyBudget: calculateMonthlyBudget(city),
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
  floor = INCOME_EXPLORE_MIN,
): number {
  const stepped = Math.round(value / INCOME_EXPLORE_STEP) * INCOME_EXPLORE_STEP
  return Math.min(INCOME_EXPLORE_MAX, Math.max(floor, stepped))
}

export type ExplorationIncomeRange = {
  min: number
  max: number
}

export function defaultExplorationIncomeRange(planMonthlyIncome: number): ExplorationIncomeRange {
  const plan = clampExplorationIncome(planMonthlyIncome)
  return { min: plan, max: plan }
}

export function isDefaultExplorationIncomeRange(
  planMonthlyIncome: number,
  range: ExplorationIncomeRange,
): boolean {
  const planRange = defaultExplorationIncomeRange(planMonthlyIncome)
  return range.min === planRange.min && range.max === planRange.max
}

export function clampExplorationIncomeRange(
  min: number,
  max: number,
): ExplorationIncomeRange {
  let clampedMin = clampExplorationIncome(min)
  let clampedMax = clampExplorationIncome(max)
  if (clampedMax < clampedMin + INCOME_EXPLORE_STEP) {
    clampedMax = Math.min(
      INCOME_EXPLORE_MAX,
      clampedMin + INCOME_EXPLORE_STEP,
    )
  }
  if (clampedMin > clampedMax - INCOME_EXPLORE_STEP) {
    clampedMin = Math.max(INCOME_EXPLORE_MIN, clampedMax - INCOME_EXPLORE_STEP)
  }
  return { min: clampedMin, max: clampedMax }
}
