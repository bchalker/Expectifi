import type {
  BudgetRange,
  ClimatePreference,
  CuratedDestination,
  DestinationRegion,
  StaticGauge,
} from '../../data/curatedRetirementDestinations'
import {
  buildRetirementIncomeFitExplanation,
  calculateRetirementIncomeFitScore,
  matchRetirementIncomeFitTier,
  type RetirementIncomeFitTier,
} from './retirementIncomeFitScore'

export type MatchTier = RetirementIncomeFitTier

export type MapFilters = {
  climates: ClimatePreference[]
  budgets: BudgetRange[]
  regions: DestinationRegion[]
}

export type CostOfLivingGauge = StaticGauge & { score: number }

export type ScoredCuratedDestination = {
  destination: CuratedDestination
  overallScore: number
  tier: MatchTier
  colGauge: CostOfLivingGauge
  pinSizePx: number
}

export type FitGaugeItem = {
  id: string
  label: string
  score: number
  explanation: string
  tier: MatchTier
}

export function matchTier(score: number): MatchTier {
  return matchRetirementIncomeFitTier(score)
}

export function tierCssModifier(tier: MatchTier): string {
  return tier
}

export function computeColGauge(
  userMonthlyIncome: number,
  avgExpatCostUsd: number,
): CostOfLivingGauge {
  const income = Math.max(0, userMonthlyIncome)
  const cost = Math.max(500, avgExpatCostUsd)
  const score = calculateRetirementIncomeFitScore(income, cost)
  const explanation = buildRetirementIncomeFitExplanation(income, score)
  return { score, explanation }
}

export function computeOverallScore(
  destination: CuratedDestination,
  userMonthlyIncome: number,
): number {
  const col = computeColGauge(userMonthlyIncome, destination.avgExpatCostUsd)
  const scores = [
    destination.gauges.climate.score,
    col.score,
    destination.gauges.healthcare.score,
    destination.gauges.visa.score,
    destination.gauges.distanceFromUs.score,
    destination.gauges.english.score,
  ]
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function pinSizeForScore(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return Math.round(14 + (clamped / 100) * 18)
}

export function scoreCuratedDestination(
  destination: CuratedDestination,
  userMonthlyIncome: number,
): ScoredCuratedDestination {
  const colGauge = computeColGauge(userMonthlyIncome, destination.avgExpatCostUsd)
  const overallScore = computeOverallScore(destination, userMonthlyIncome)
  return {
    destination,
    overallScore,
    tier: matchTier(overallScore),
    colGauge,
    pinSizePx: pinSizeForScore(overallScore),
  }
}

export function buildFitGauges(
  scored: ScoredCuratedDestination,
): FitGaugeItem[] {
  const { destination, colGauge } = scored
  const items: { id: string; label: string; gauge: StaticGauge | CostOfLivingGauge }[] = [
    { id: 'climate', label: 'Climate Match', gauge: destination.gauges.climate },
    { id: 'col', label: 'Retirement income fit score', gauge: colGauge },
    { id: 'healthcare', label: 'Healthcare Quality', gauge: destination.gauges.healthcare },
    { id: 'visa', label: 'Visa & Residency Ease', gauge: destination.gauges.visa },
    { id: 'distance', label: 'Distance from US', gauge: destination.gauges.distanceFromUs },
    { id: 'english', label: 'English Friendliness', gauge: destination.gauges.english },
  ]
  return items.map(({ id, label, gauge }) => ({
    id,
    label,
    score: gauge.score,
    explanation: gauge.explanation,
    tier: matchTier(gauge.score),
  }))
}

export function passesMapFilters(
  destination: CuratedDestination,
  filters: MapFilters,
): boolean {
  if (filters.climates.length > 0 && !filters.climates.includes(destination.climate)) {
    return false
  }
  if (filters.budgets.length > 0 && !filters.budgets.includes(destination.budgetTier)) {
    return false
  }
  if (filters.regions.length > 0 && !filters.regions.includes(destination.region)) {
    return false
  }
  return true
}

export function scoreAndFilterDestinations(
  destinations: CuratedDestination[],
  userMonthlyIncome: number,
  filters: MapFilters,
): ScoredCuratedDestination[] {
  return destinations
    .filter((d) => passesMapFilters(d, filters))
    .map((d) => scoreCuratedDestination(d, userMonthlyIncome))
    .sort((a, b) => b.overallScore - a.overallScore)
}
