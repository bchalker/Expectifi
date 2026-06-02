import {
  computeAccountIncomeBreakdown,
  principalRunwayYears,
  resolveAccountIncomeStrategy,
  resolveAccountWithdrawRate,
} from './accountIncomeStrategy'
import { accountRetirementBalance } from './accountBucketRetirementBalance'
import {
  listAccountIncomeLines,
  type AccountIncomeMonthlyContext,
} from './accountIncomeMonthly'
import { marginalOrdinaryBracketLabel } from './marginalOrdinaryBracket'
import type { FilingStatusId } from './filingStatus'
import type { TaxDetailedResult } from 'shared'

type PortfolioGuidanceInputs = {
  totalFV: number
  monPort: number
  annWd: number
  monthlyIncomeGoal: number
  targetRetirementAge: number
  taxDetail: TaxDetailedResult
  strategy: { rothConvRoom: number }
  filingStatus: FilingStatusId
  tradRatio: number
  retFV: number
}

export type PortfolioGuidanceMetrics = {
  totalBalanceAtRetirement: number
  reducedBalance30Pct: number
  currentMonthlyIncome: number
  reducedMonthlyIncome: number
  blendedYieldPct: number
  currentRunwayYears: number | null
  reducedRunwayYears: number | null
  annualPortfolioIncome: number
  monthlyIncomeGoal: number
  annualIncomeGoal: number
  incomeMeetsOrExceedsGoal: boolean
  incomeGoalCoveragePct: number
  monthlyIncomeGap: number
  marginalOrdinaryBracket: string
  effectiveTaxRatePct: string
  pretaxBalanceAtRetirement: number
  retirementAge: number
  rothConversionRoom: number
}

function aggregatePortfolioRunway(
  ctx: AccountIncomeMonthlyContext,
  balanceScale: number,
): number | null {
  let totalWithdrawBalance = 0
  let totalAnnualWithdraw = 0
  let navDriftWeighted = 0

  const snapshot = {
    hasPortfolioBalances: ctx.hasPortfolioBalances,
    retFV: ctx.retFV,
    brkFV: ctx.brkFV,
    tradRatio: ctx.tradRatio,
    rothRatio: ctx.rothRatio,
    hsaRatio: ctx.hsaRatio,
    tradBal: ctx.tradBal,
    rothBal: ctx.rothBal,
    hsaBal: ctx.hsaBal,
  }

  for (const line of listAccountIncomeLines(ctx)) {
    const atRetirement =
      accountRetirementBalance(
        line.bucket,
        line.currentBalance,
        line.bucketCurrentTotal,
        snapshot,
      ) * balanceScale

    const strategy = resolveAccountIncomeStrategy(
      line.storageKey,
      line.bucket,
      ctx.accountIncomeStrategies,
    )

    if (strategy !== 'withdraw' && strategy !== 'both') continue

    const withdrawRate = resolveAccountWithdrawRate(
      line.storageKey,
      strategy,
      ctx.accountWithdrawRates,
    )

    const breakdown = computeAccountIncomeBreakdown({
      line,
      balanceAtRetirement: atRetirement,
      strategy,
      withdrawRate,
      inflationAdj: ctx.wdInflation,
      accountIncomeFunds: ctx.accountIncomeFunds,
      medicalAnnualDraw: line.bucket === 'hsa' ? ctx.hsaMedicalAnnualDraw : undefined,
    })

    if (breakdown.annualWithdraw <= 0) continue

    totalWithdrawBalance += atRetirement
    totalAnnualWithdraw += breakdown.annualWithdraw
    if (breakdown.navDriftPct != null && breakdown.navDriftPct > 0) {
      navDriftWeighted += breakdown.navDriftPct * atRetirement
    }
  }

  if (totalWithdrawBalance <= 0 || totalAnnualWithdraw <= 0) return null

  const avgNavDrift =
    totalWithdrawBalance > 0 ? navDriftWeighted / totalWithdrawBalance / 100 : 0

  return principalRunwayYears(
    totalWithdrawBalance,
    totalAnnualWithdraw,
    ctx.wdInflation,
    avgNavDrift,
  )
}

export function computePortfolioGuidanceMetrics(
  c: PortfolioGuidanceInputs,
  ctx: AccountIncomeMonthlyContext,
): PortfolioGuidanceMetrics {
  const totalBalanceAtRetirement = c.totalFV
  const reducedBalance30Pct = totalBalanceAtRetirement * 0.7
  const currentMonthlyIncome = c.monPort
  const annualPortfolioIncome = c.annWd
  const blendedYieldPct =
    totalBalanceAtRetirement > 0 ? (annualPortfolioIncome / totalBalanceAtRetirement) * 100 : 0
  const reducedMonthlyIncome = (reducedBalance30Pct * (blendedYieldPct / 100)) / 12

  const monthlyIncomeGoal = c.monthlyIncomeGoal
  const annualIncomeGoal = monthlyIncomeGoal * 12
  const incomeMeetsOrExceedsGoal = currentMonthlyIncome >= monthlyIncomeGoal
  const incomeGoalCoveragePct =
    monthlyIncomeGoal > 0
      ? Math.min(100, Math.round((currentMonthlyIncome / monthlyIncomeGoal) * 1000) / 10)
      : 100
  const monthlyIncomeGap = Math.max(0, monthlyIncomeGoal - currentMonthlyIncome)

  return {
    totalBalanceAtRetirement,
    reducedBalance30Pct,
    currentMonthlyIncome,
    reducedMonthlyIncome,
    blendedYieldPct,
    currentRunwayYears: aggregatePortfolioRunway(ctx, 1),
    reducedRunwayYears: aggregatePortfolioRunway(ctx, 0.7),
    annualPortfolioIncome,
    monthlyIncomeGoal,
    annualIncomeGoal,
    incomeMeetsOrExceedsGoal,
    incomeGoalCoveragePct,
    monthlyIncomeGap,
    marginalOrdinaryBracket: marginalOrdinaryBracketLabel(
      c.taxDetail.ordinaryIncome,
      c.filingStatus,
    ),
    effectiveTaxRatePct: (c.taxDetail.effectiveRate * 100).toFixed(1),
    pretaxBalanceAtRetirement: c.retFV * c.tradRatio,
    retirementAge: c.targetRetirementAge,
    rothConversionRoom: c.strategy.rothConvRoom,
  }
}
