import type { ImpactRating, LifeEventConfig } from './types'

export type { ImpactRating } from './types'

export interface HsaOffsetResult {
  grossExpense: number
  hsaOffset: number
  netExpense: number
  fullyCovered: boolean
  hasHsa: boolean
}

export function calcHsaOffset(grossExpense: number, hsaBalance: number): HsaOffsetResult {
  const hasHsa = hsaBalance > 0
  const hsaOffset = Math.min(hsaBalance, grossExpense)
  const netExpense = Math.max(0, grossExpense - hsaOffset)
  const fullyCovered = netExpense === 0

  return {
    grossExpense,
    hsaOffset,
    netExpense,
    fullyCovered,
    hasHsa,
  }
}

export function calcFutureValue(
  amount: number,
  eventYear: number,
  retirementYear: number,
  growthRate: number,
): number {
  const years = Math.max(0, retirementYear - eventYear)
  return Math.round((amount * Math.pow(1 + growthRate, years)) / 100) * 100
}

export function calcImpactRating(futureValue: number, retirementPortfolio: number): ImpactRating {
  if (retirementPortfolio <= 0) return 'minimal'
  const ratio = Math.abs(futureValue) / retirementPortfolio
  if (ratio < 0.005) return 'minimal'
  if (ratio < 0.02) return 'light'
  if (ratio < 0.05) return 'moderate'
  if (ratio < 0.1) return 'heavy'
  return 'significant'
}

export function calcEventValues(
  amount: number,
  eventYear: number,
  retirementYear: number,
  retirementPortfolio: number,
  growthRate: number,
): {
  futureValue: number
  afterEventPortfolio: number
  rating: ImpactRating
  totalOutflow: number
} {
  const futureValue = calcFutureValue(amount, eventYear, retirementYear, growthRate)
  return {
    futureValue,
    afterEventPortfolio: retirementPortfolio - futureValue,
    rating: calcImpactRating(futureValue, retirementPortfolio),
    totalOutflow: amount,
  }
}

export function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

export function formatCurrencyCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(2) + 'M'
  }
  return '$' + Math.round(n / 1000) + 'k'
}

export function formatStripPortfolioValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  return `$${(value / 1000).toFixed(0)}k`
}

export function formatCollapsedSummaryAmount(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (abs >= 10_000) {
    return `$${Math.round(value / 1000)}k`
  }
  if (abs >= 1_000) {
    const thousands = value / 1000
    return Number.isInteger(thousands)
      ? `$${thousands}k`
      : `$${thousands.toFixed(1)}k`
  }
  return formatCurrency(value)
}

export function formatInstanceCollapsedSummary(
  config: LifeEventConfig,
  params: {
    year: number
    amount: number
    mortgageInterestSaved?: number
    hsaResult?: HsaOffsetResult | null
  },
): string {
  const { year, amount, mortgageInterestSaved, hsaResult } = params

  if (config.id === 'pay-off-mortgage' || config.id === 'pay-student-loans') {
    const interestSaved = mortgageInterestSaved ?? 0
    return `One-time · payoff ${year} · ${formatCollapsedSummaryAmount(interestSaved)} interest saved`
  }

  if (config.id === 'medical-expense' && hsaResult) {
    if (hsaResult.fullyCovered) {
      return `One-time · ${year} · fully covered by HSA`
    }
    if (hsaResult.hsaOffset > 0) {
      return `One-time · ${year} · ${formatCollapsedSummaryAmount(hsaResult.hsaOffset)} covered by HSA`
    }
  }

  return `One-time · ${year} · ${formatCollapsedSummaryAmount(amount)}`
}

export function lifeEventRangeFillStyle(
  value: number,
  min: number,
  max: number,
): Record<string, string> {
  const span = max - min
  const pct = span > 0 ? ((value - min) / span) * 100 : 0
  return { '--range-fill': `${pct}%` }
}

export type { MortgageTradeoffResult } from '../../lib/calc/mortgageLifeEvent'
export {
  calcMortgageBreakEvenRate,
  calcMortgageTradeoff,
  formatMortgageBreakEvenSentence,
} from '../../lib/calc/mortgageLifeEvent'
