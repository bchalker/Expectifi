import {
  expatCommunityPinColor,
  expatCommunityPinLabel,
  expatCommunityPinTier,
  type ExpatCommunityPinTier,
} from '../../utils/expatInfo'
import type { RetirementScoreBand } from '../../utils/retirementScore'
export { scorePinBandFromScore } from '../../utils/retirementScore'
import type { ScoredMapCity } from './cityMapScoring'

export type MapPinColorView = 'score' | 'budget' | 'expat'

export type BudgetFitBand = 'well-within' | 'comfortable' | 'tight' | 'over-budget'

export type MapPinBandClass =
  | RetirementScoreBand
  | BudgetFitBand
  | ExpatCommunityPinTier
  | 'favorite'

export const FAVORITE_PIN_COLOR = '#f59e0b'

export type MapPinDisplay = {
  pinColor: string
  bandClass: MapPinBandClass
  displayScore: number
  bandLabel: string
  tooltipScoreLabel: string
}

export type MapPinLegendItem = {
  bandClass: string
  color: string
  label: string
}

const SESSION_KEY = 'wtr-map-pin-color-view'

export function readMapPinColorView(): MapPinColorView {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored === 'score' || stored === 'budget' || stored === 'expat') return stored
  } catch {
    /* sessionStorage unavailable */
  }
  return 'score'
}

export function writeMapPinColorView(view: MapPinColorView): void {
  try {
    sessionStorage.setItem(SESSION_KEY, view)
  } catch {
    /* sessionStorage unavailable */
  }
}

function budgetDisplay(monthlyBudget: number, monthlyIncome: number): MapPinDisplay {
  const ratio =
    monthlyIncome > 0 ? monthlyBudget / monthlyIncome : monthlyBudget > 0 ? 2 : 0
  const pct = Math.round(ratio * 100)

  if (ratio <= 0.5) {
    return {
      pinColor: '#22c55e',
      bandClass: 'well-within',
      displayScore: pct,
      bandLabel: 'Well within budget',
      tooltipScoreLabel: `${pct}% of income`,
    }
  }
  if (ratio <= 0.75) {
    return {
      pinColor: '#f59e0b',
      bandClass: 'comfortable',
      displayScore: pct,
      bandLabel: 'Comfortable',
      tooltipScoreLabel: `${pct}% of income`,
    }
  }
  if (ratio <= 1) {
    return {
      pinColor: '#f97316',
      bandClass: 'tight',
      displayScore: pct,
      bandLabel: 'Tight',
      tooltipScoreLabel: `${pct}% of income`,
    }
  }
  return {
    pinColor: '#ef4444',
    bandClass: 'over-budget',
    displayScore: pct,
    bandLabel: 'Over budget',
    tooltipScoreLabel: `${pct}% of income`,
  }
}

function expatDisplay(country: string): MapPinDisplay {
  const tier = expatCommunityPinTier(country)
  const label = expatCommunityPinLabel(country)
  const tooltipScoreLabel =
    tier === 'domestic'
      ? 'Domestic US retirement'
      : label === 'No data'
        ? 'No expat data'
        : `${label} expat community`
  return {
    pinColor: expatCommunityPinColor(country),
    bandClass: tier,
    displayScore: 0,
    bandLabel: label,
    tooltipScoreLabel,
  }
}

function baseMapPinDisplay(
  scored: ScoredMapCity,
  view: MapPinColorView,
  monthlyIncome: number,
): MapPinDisplay {
  if (view === 'expat') {
    return expatDisplay(scored.city.country)
  }
  if (view === 'budget') {
    return budgetDisplay(scored.monthlyBudget, monthlyIncome)
  }
  return {
    pinColor: scored.bandColor,
    bandClass: scored.band,
    displayScore: scored.displayScore,
    bandLabel: scored.bandLabel,
    tooltipScoreLabel: `Retirement score ${scored.displayScore}`,
  }
}

export function resolveMapPinDisplay(
  scored: ScoredMapCity,
  view: MapPinColorView,
  monthlyIncome: number,
  isFavorite = false,
): MapPinDisplay {
  const base = baseMapPinDisplay(scored, view, monthlyIncome)
  if (!isFavorite) return base
  return {
    ...base,
    pinColor: FAVORITE_PIN_COLOR,
    bandClass: 'favorite',
    bandLabel: 'Favorite',
    tooltipScoreLabel: `${base.tooltipScoreLabel} · Saved favorite`,
  }
}

export const SCORE_PIN_LEGEND: MapPinLegendItem[] = [
  { bandClass: 'excellent', color: '#1E8E47', label: 'Excellent' },
  { bandClass: 'good', color: '#27b95d', label: 'Good' },
  { bandClass: 'moderate', color: '#f1a841', label: 'Moderate' },
  { bandClass: 'poor', color: '#BF3A2B', label: 'Poor' },
]

export const BUDGET_PIN_LEGEND: MapPinLegendItem[] = [
  { bandClass: 'well-within', color: '#22c55e', label: 'Well within' },
  { bandClass: 'comfortable', color: '#f59e0b', label: 'Comfortable' },
  { bandClass: 'tight', color: '#f97316', label: 'Tight' },
  { bandClass: 'over-budget', color: '#ef4444', label: 'Over budget' },
]

export const EXPAT_PIN_LEGEND: MapPinLegendItem[] = [
  { bandClass: 'enormous', color: '#22c55e', label: 'Enormous' },
  { bandClass: 'very-large', color: '#0d9488', label: 'Very large' },
  { bandClass: 'large', color: '#3b82f6', label: 'Large' },
  { bandClass: 'moderate', color: '#f59e0b', label: 'Moderate' },
  { bandClass: 'small', color: '#94a3b8', label: 'Limited' },
]

export const EXPAT_LEGEND_TIER_IDS = [
  'enormous',
  'very-large',
  'large',
  'moderate',
  'small',
] as const

export type ExpatLegendTierId = (typeof EXPAT_LEGEND_TIER_IDS)[number]
