import type { CSSProperties } from 'react'
import { findOnboardingRegion, type OnboardingRegionId } from '../../../lib/onboardingRegions'
import {
  calculateMonthlyBudget,
  DEFAULT_LIFESTYLE,
  formatUsd,
  getAllMapCities,
  type CityData,
} from '../../../utils/costOfLiving'
import { getQualityOfLifeData, qolNormalizedFromIndex } from '../../../utils/qualityOfLife'

export const MISSING_FIELD_TEXT = 'Not reported'
export const INDEX_UNAVAILABLE_DISPLAY = '—'

export type DollarStrengthBand = 'strong' | 'moderate' | 'weak'

export function getColIndexForCountry(country: string): number | null {
  const qol = getQualityOfLifeData(country)
  if (qol?.cost_of_living_index == null) return null
  return Math.round(qol.cost_of_living_index)
}

export function getQolIndexNormalizedForCountry(country: string): number | null {
  const qol = getQualityOfLifeData(country)
  if (!qol) return null
  return qolNormalizedFromIndex(qol.quality_of_life_index)
}

export function homeBenchmarkCountryForLocale(locale: OnboardingRegionId): string {
  return findOnboardingRegion(locale)?.country ?? 'United States'
}

export function getHomeColBenchmark(locale: OnboardingRegionId): number | null {
  return getColIndexForCountry(homeBenchmarkCountryForLocale(locale))
}

export function getHomeQolBenchmark(locale: OnboardingRegionId): number | null {
  return getQolIndexNormalizedForCountry(homeBenchmarkCountryForLocale(locale))
}

export function homeAvgShortLabel(locale: OnboardingRegionId): string {
  return locale === 'ca' ? 'Canadian avg' : 'US avg'
}

export function homeAvgLongLabel(locale: OnboardingRegionId): string {
  return locale === 'ca' ? 'Canadian average' : 'US average'
}

/** Title case label for inline comparison row (e.g. "US Average"). */
export function homeAvgTitleLabel(locale: OnboardingRegionId): string {
  return locale === 'ca' ? 'Canadian Average' : 'US Average'
}

export type ColIndexBand = 'affordable' | 'moderate' | 'expensive'

export function colIndexBand(value: number, benchmark: number): ColIndexBand {
  if (value < benchmark * 0.92) return 'affordable'
  if (value <= benchmark * 1.08) return 'moderate'
  return 'expensive'
}

export const COL_INDEX_BAND_LABELS: Record<ColIndexBand, string> = {
  affordable: 'Affordable',
  moderate: 'Moderate',
  expensive: 'Expensive',
}

export type QolIndexBand = 'above-average' | 'average' | 'below-average'

export function qolIndexBandRelative(value: number, benchmark: number): QolIndexBand {
  if (value > benchmark * 1.02) return 'above-average'
  if (value >= benchmark * 0.95) return 'average'
  return 'below-average'
}

export const QOL_INDEX_BAND_LABELS: Record<QolIndexBand, string> = {
  'above-average': 'Above average',
  average: 'Average',
  'below-average': 'Below average',
}

export function colComparisonCopy(
  value: number,
  benchmark: number,
  locale: OnboardingRegionId,
): string {
  const parts = colComparisonParts(value, benchmark, locale)
  if (!parts) return ''
  return `${parts.pillLabel} ${parts.suffixBeforeBenchmark}${parts.benchmarkPhrase}`
}

export function qolComparisonCopy(
  value: number,
  benchmark: number,
  locale: OnboardingRegionId,
): string {
  const parts = qolComparisonParts(value, benchmark, locale)
  if (!parts) return ''
  return `${parts.pillLabel} ${parts.suffixBeforeBenchmark}${parts.benchmarkPhrase}`
}

export type IndexComparisonParts = {
  pillLabel: string
  suffixBeforeBenchmark: string
  benchmarkPhrase: string
}

export function colComparisonParts(
  value: number,
  benchmark: number,
  locale: OnboardingRegionId,
): IndexComparisonParts | null {
  const ref = homeAvgTitleLabel(locale)
  if (value === benchmark) {
    return { pillLabel: 'Same as', suffixBeforeBenchmark: 'the ', benchmarkPhrase: ref }
  }
  const pct = Math.round((Math.abs(benchmark - value) / benchmark) * 100)
  if (value < benchmark) {
    return { pillLabel: `${pct}% cheaper`, suffixBeforeBenchmark: 'than the ', benchmarkPhrase: ref }
  }
  return {
    pillLabel: `${pct}% more expensive`,
    suffixBeforeBenchmark: 'than the ',
    benchmarkPhrase: ref,
  }
}

export function qolComparisonParts(
  value: number,
  benchmark: number,
  locale: OnboardingRegionId,
): IndexComparisonParts | null {
  const ref = homeAvgTitleLabel(locale)
  if (value === benchmark) {
    return { pillLabel: 'Same as', suffixBeforeBenchmark: 'the ', benchmarkPhrase: ref }
  }
  const pct = Math.round((Math.abs(value - benchmark) / benchmark) * 100)
  if (value > benchmark) {
    return { pillLabel: `${pct}% above`, suffixBeforeBenchmark: 'the ', benchmarkPhrase: ref }
  }
  return { pillLabel: `${pct}% below`, suffixBeforeBenchmark: 'the ', benchmarkPhrase: ref }
}

export function indexBarScaleMax(value: number, benchmark: number, floor = 100): number {
  return Math.max(floor, value, benchmark)
}

let usBenchmarkBudgetCache: number | null = null

/** Median monthly living-cost budget across US cities in our dataset (same formula as destination budgets). */
export function usBenchmarkMonthlyBudget(): number {
  if (usBenchmarkBudgetCache != null) return usBenchmarkBudgetCache
  const budgets = getAllMapCities()
    .filter((city) => city.country === 'United States')
    .map((city) => calculateMonthlyBudget(city, DEFAULT_LIFESTYLE).total)
    .filter((budget) => budget > 0)
    .sort((a, b) => a - b)
  usBenchmarkBudgetCache = budgets[Math.floor(budgets.length / 2)] ?? 2500
  return usBenchmarkBudgetCache
}

/**
 * How far US income stretches in this city vs a typical US city.
 * Uses city-level Numbeo budget components — not the exchange rate.
 */
export function purchasingPowerMultiplierForCity(city: CityData): number | null {
  const cityBudget = calculateMonthlyBudget(city, DEFAULT_LIFESTYLE).total
  if (cityBudget <= 0) return null
  const benchmark = usBenchmarkMonthlyBudget()
  return Number((benchmark / cityBudget).toFixed(1))
}

/** @deprecated Prefer purchasingPowerMultiplierForCity — kept for country-only contexts. */
export function usPurchasingPowerMultiplier(colIndex: number): number {
  const usCol = getColIndexForCountry('United States')
  const baseline = usCol != null && usCol > 0 ? usCol : 100
  return Number((baseline / colIndex).toFixed(1))
}

export function dollarStrengthBand(multiplier: number): DollarStrengthBand {
  if (multiplier >= 2) return 'strong'
  if (multiplier >= 1) return 'moderate'
  return 'weak'
}

export const DOLLAR_STRENGTH_LABELS: Record<DollarStrengthBand, string> = {
  strong: 'Dollar is strong here',
  moderate: 'Dollar is moderate here',
  weak: 'Dollar is weak here',
}

export type CityDetailTabStaggerProps = {
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

export function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {}
  }
  return {
    className: baseClass ? `${baseClass} ${staggerClassName}` : staggerClassName,
    style: staggerStyle(index),
  }
}

export function formatUsdField(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return MISSING_FIELD_TEXT
  }
  return formatUsd(amount)
}

export function formatTextField(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : MISSING_FIELD_TEXT
}
