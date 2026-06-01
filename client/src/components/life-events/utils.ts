import type { ImpactRating, LifeEventCalculated, LifeEventConfig, MedicalEventExtras, MortgageEventExtras } from './types'

export type { ImpactRating } from './types'

export function isMortgageEventExtras(extras: LifeEventConfig['extras']): extras is MortgageEventExtras {
  return extras != null && 'showTradeoffAnalysis' in extras
}

export function isMedicalEventExtras(extras: LifeEventConfig['extras']): extras is MedicalEventExtras {
  return extras != null && 'showHsaAnalysis' in extras
}

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

export function eventImpactAmount(
  config: LifeEventConfig,
  grossAmount: number,
  hsaBalance: number,
): number {
  if (isMedicalEventExtras(config.extras)) {
    return calcHsaOffset(grossAmount, hsaBalance).netExpense
  }
  return grossAmount
}

export function calcEventImpactFutureValue(
  config: LifeEventConfig,
  grossAmount: number,
  eventYear: number,
  retirementYear: number,
  growthRate: number,
  hsaBalance: number,
  duration?: number,
): number {
  if (isMedicalEventExtras(config.extras)) {
    const amount = calcHsaOffset(grossAmount, hsaBalance).netExpense
    return calcEventValues(amount, eventYear, retirementYear, 0, growthRate, false).futureValue
  }

  return calcEventValues(
    grossAmount,
    eventYear,
    retirementYear,
    0,
    growthRate,
    config.isRecurring,
    duration ?? config.defaultDuration,
  ).futureValue
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

export function calcRecurringFutureValue(
  monthlyAmount: number,
  startYear: number,
  durationYears: number,
  retirementYear: number,
  growthRate: number,
): number {
  if (durationYears <= 0) return 0

  const annualAmount = monthlyAmount * 12
  let total = 0

  for (let yr = startYear; yr < startYear + durationYears; yr++) {
    if (yr >= retirementYear) break
    const yearsToGrow = retirementYear - yr - 0.5
    total += annualAmount * Math.pow(1 + growthRate, yearsToGrow)
  }

  return Math.round(total / 100) * 100
}

export function calcTotalOutflow(
  amount: number,
  isRecurring: boolean,
  duration?: number,
): number {
  if (!isRecurring) return amount
  return amount * 12 * (duration || 0)
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
  isRecurring = false,
  duration?: number,
): LifeEventCalculated {
  const futureValue = isRecurring
    ? calcRecurringFutureValue(
        amount,
        eventYear,
        duration || 0,
        retirementYear,
        growthRate,
      )
    : calcFutureValue(amount, eventYear, retirementYear, growthRate)

  const totalOutflow = calcTotalOutflow(amount, isRecurring, duration)

  return {
    futureValue,
    afterEventPortfolio: retirementPortfolio - futureValue,
    rating: calcImpactRating(futureValue, retirementPortfolio),
    totalOutflow,
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

export interface MortgageTradeoffResult {
  investmentGain: number
  interestSaved: number
  netAdvantageOfInvesting: number
  investingWins: boolean
}

export function calcMortgageTradeoff(
  payoffAmount: number,
  mortgageRate: number,
  portfolioGrowthRate: number,
  eventYear: number,
  retirementYear: number,
): MortgageTradeoffResult {
  const yearsToRetirement = Math.max(0, retirementYear - eventYear)

  const investmentGain =
    calcFutureValue(payoffAmount, eventYear, retirementYear, portfolioGrowthRate) - payoffAmount

  const interestSaved = payoffAmount * mortgageRate * yearsToRetirement

  const netAdvantageOfInvesting = investmentGain - interestSaved

  return {
    investmentGain,
    interestSaved,
    netAdvantageOfInvesting: Math.round(netAdvantageOfInvesting / 100) * 100,
    investingWins: netAdvantageOfInvesting > 0,
  }
}
