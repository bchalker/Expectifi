import { deriveMortgageLifeEvent } from '../../lib/calc/mortgageLifeEvent'
import type {
  ImpactRating,
  InstanceImpactResult,
  LifeEventConfig,
  LifeEventInstance,
  LifeEventTypeCard,
  TypeCardImpactResult,
} from './types'
import {
  calcFutureValue,
  calcHsaOffset,
  calcImpactRating,
} from './utils'

export interface InstanceImpactContext {
  config: LifeEventConfig
  instance: LifeEventInstance
  currentYear: number
  retirementYear: number
  growthRate: number
  retirementPortfolio: number
  hsaBalance: number
}

function round100(n: number): number {
  return Math.round(n / 100) * 100
}

export function calcLoanTotalInterest(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0
  const r = annualRate / 12
  const n = termYears * 12
  if (r <= 0) return 0
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return round100(Math.max(0, payment * n - principal))
}

export function calcLoanMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0
  const r = annualRate / 12
  const n = termYears * 12
  if (r <= 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function outflowFv(netAmount: number, year: number, ctx: InstanceImpactContext): number {
  return calcFutureValue(netAmount, year, ctx.retirementYear, ctx.growthRate)
}

function outflowResult(
  netAmount: number,
  year: number,
  ctx: InstanceImpactContext,
  extras?: Partial<InstanceImpactResult>,
): InstanceImpactResult {
  const futureValue = outflowFv(netAmount, year, ctx)
  return {
    futureValue,
    netAmount,
    rating: calcImpactRating(futureValue, ctx.retirementPortfolio),
    ...extras,
  }
}

function inflowResult(
  netAmount: number,
  year: number,
  ctx: InstanceImpactContext,
): InstanceImpactResult {
  const futureValue = calcFutureValue(netAmount, year, ctx.retirementYear, ctx.growthRate)
  return {
    futureValue: -futureValue,
    netAmount,
    rating: calcImpactRating(futureValue, ctx.retirementPortfolio),
  }
}

export function calcInstanceImpact(ctx: InstanceImpactContext): InstanceImpactResult {
  const { config, instance } = ctx
  const id = config.id

  if (id === 'medical-expense') {
    const gross = instance.amount
    const defaultHsa = calcHsaOffset(gross, ctx.hsaBalance)
    const hsaOffset =
      instance.hsaOffsetAmount != null
        ? Math.min(gross, Math.max(0, instance.hsaOffsetAmount))
        : defaultHsa.hsaOffset
    const hsaResult = {
      grossExpense: gross,
      hsaOffset,
      netExpense: Math.max(0, gross - hsaOffset),
      fullyCovered: gross - hsaOffset <= 0,
      hasHsa: ctx.hsaBalance > 0 || hsaOffset > 0,
    }
    const withoutHsa = calcFutureValue(gross, instance.year, ctx.retirementYear, ctx.growthRate)
    const withHsa = calcFutureValue(
      hsaResult.netExpense,
      instance.year,
      ctx.retirementYear,
      ctx.growthRate,
    )
    const rating =
      hsaResult.fullyCovered ? 'minimal' : calcImpactRating(withHsa, ctx.retirementPortfolio)
    return {
      futureValue: withHsa,
      netAmount: hsaResult.netExpense,
      rating,
      hsaResult,
      hsaSavings: withoutHsa - withHsa,
    }
  }

  if (id === 'pay-off-mortgage' || id === 'pay-student-loans') {
    return outflowResult(instance.amount, instance.year, ctx)
  }

  if (id === 'home-renovation') {
    if (instance.financingEnabled) {
      const financed = instance.financedAmount ?? instance.amount * 0.5
      const cashPortion = Math.max(0, instance.amount - financed)
      const interest = calcLoanTotalInterest(financed, instance.loanRate ?? 0.08, 15)
      return outflowResult(cashPortion + interest, instance.year, ctx)
    }
    return outflowResult(instance.amount, instance.year, ctx)
  }

  if (id === 'buy-vacation-property') {
    const down = instance.downPayment ?? instance.amount * 0.2
    return outflowResult(down, instance.year, ctx)
  }

  if (id === 'divorce') {
    const splitAmount = instance.divorceIsPercent
      ? ctx.retirementPortfolio * ((instance.divorcePercent ?? 50) / 100)
      : instance.amount
    return outflowResult(splitAmount, instance.year, ctx)
  }

  if (
    id === 'inheritance' ||
    id === 'sell-business' ||
    id === 'sell-property' ||
    id === 'pension-lump-sum'
  ) {
    let afterTax = instance.amount
    if (id === 'sell-business' || id === 'sell-property') {
      afterTax = instance.amount * (1 - (instance.taxRate ?? 0.2))
    }
    if (id === 'pension-lump-sum') {
      afterTax = instance.amount * (1 - (instance.taxWithholding ?? 0.22))
    }
    return inflowResult(afterTax, instance.year, ctx)
  }

  if (config.direction === 'inflow') {
    return inflowResult(instance.amount, instance.year, ctx)
  }

  return outflowResult(instance.amount, instance.year, ctx)
}

export function calcTypeCardImpact(
  card: LifeEventTypeCard,
  config: LifeEventConfig,
  ctx: Omit<InstanceImpactContext, 'config' | 'instance'>,
): TypeCardImpactResult {
  const instanceResults = new Map<string, InstanceImpactResult>()
  let totalFutureValue = 0
  let totalNetAmount = 0
  let highestRating: ImpactRating = 'minimal'
  const ratingOrder: ImpactRating[] = ['minimal', 'light', 'moderate', 'heavy', 'significant']

  for (const instance of card.instances) {
    const result = calcInstanceImpact({ ...ctx, config, instance })
    instanceResults.set(instance.id, result)
    totalFutureValue += result.futureValue
    totalNetAmount += result.netAmount
    if (ratingOrder.indexOf(result.rating) > ratingOrder.indexOf(highestRating)) {
      highestRating = result.rating
    }
  }

  return {
    totalFutureValue,
    totalNetAmount,
    highestRating,
    instanceResults,
  }
}

export function formatCardDetailLine(
  config: LifeEventConfig,
  card: LifeEventTypeCard,
  instanceResults: Map<string, InstanceImpactResult>,
): string {
  const count = card.instances.length
  const sign = config.direction === 'inflow' ? '+' : '−'
  const totalFv = [...instanceResults.values()].reduce((s, r) => s + Math.abs(r.futureValue), 0)

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    return `$${Math.round(n / 1000)}k`
  }

  if (count > 1) {
    return `${count} ${config.instanceNoun} · ${sign}${formatCompact(totalFv)} total`
  }

  const inst = card.instances[0]
  if (inst?.label.trim()) {
    return `1. ${inst.label.trim()}`
  }

  if (config.labelPlaceholder) {
    return `1. ${config.labelPlaceholder}`
  }

  return `One-time · ${inst?.year ?? ''}`
}

export { deriveMortgageLifeEvent }
