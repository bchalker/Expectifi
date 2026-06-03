import { recommendedAccountIncomeStrategy } from './accountIncomeRecommendation'
import type { AccountScenarioBucketId } from './accountReturnScenario'
import { monthlyIncomeFromFund, resolveAccountIncomeFundTicker } from './accountIncomeFund'
import {
  findIncomeSecurity,
  formatSecurityYieldPct,
  navDriftFromErosionRisk,
  type IncomeSecurity,
} from './incomeSecurities'
import type { AccountIncomeLine } from './accountIncomeMonthly'

export type AccountIncomeStrategy = 'none' | 'dividend' | 'withdraw' | 'both'

export const ACCOUNT_WITHDRAW_RATE_MIN = 0.005
export const ACCOUNT_WITHDRAW_RATE_MAX = 0.1
export const DEFAULT_ACCOUNT_WITHDRAW_RATE = 0.04
export const DEFAULT_BOTH_WITHDRAW_RATE = 0.02

export type AccountIncomeBreakdown = {
  strategy: AccountIncomeStrategy
  monthlyTotal: number
  monthlyDividend: number
  monthlyWithdraw: number
  annualWithdraw: number
  yieldPct: number | null
  withdrawRate: number | null
  fundTicker: string | null
  fundLabel: string | null
  runwayYears: number | null
  navDriftPct: number | null
  preservedBalance: number | null
  collapsedSubtext: string
  /** Collapsed row pill: "Dividend · JEPI 9.1%" etc. */
  strategyBadgeLabel: string
}

export function defaultAccountIncomeStrategy(bucket: AccountScenarioBucketId): AccountIncomeStrategy {
  if (bucket === 'hsa') return recommendedAccountIncomeStrategy('hsa')
  return 'none'
}

export function defaultWithdrawRateForStrategy(strategy: AccountIncomeStrategy): number {
  if (strategy === 'both') return DEFAULT_BOTH_WITHDRAW_RATE
  return DEFAULT_ACCOUNT_WITHDRAW_RATE
}

export function togglesFromStrategy(strategy: AccountIncomeStrategy): {
  dividendOn: boolean
  withdrawOn: boolean
} {
  switch (strategy) {
    case 'none':
      return { dividendOn: false, withdrawOn: false }
    case 'dividend':
      return { dividendOn: true, withdrawOn: false }
    case 'withdraw':
      return { dividendOn: false, withdrawOn: true }
    case 'both':
      return { dividendOn: true, withdrawOn: true }
  }
}

export function strategyFromToggles(dividendOn: boolean, withdrawOn: boolean): AccountIncomeStrategy {
  if (dividendOn && withdrawOn) return 'both'
  if (dividendOn) return 'dividend'
  if (withdrawOn) return 'withdraw'
  return 'none'
}

export function resolveAccountIncomeStrategy(
  storageKey: string,
  bucket: AccountScenarioBucketId,
  stored: Record<string, AccountIncomeStrategy> | undefined,
): AccountIncomeStrategy {
  const raw = stored?.[storageKey]
  if (raw === 'dividend' || raw === 'withdraw' || raw === 'both') return raw
  if (raw === 'none') return bucket === 'hsa' ? 'withdraw' : 'none'
  return defaultAccountIncomeStrategy(bucket)
}

export function resolveAccountWithdrawRate(
  storageKey: string,
  strategy: AccountIncomeStrategy,
  stored: Record<string, number> | undefined,
): number {
  const raw = stored?.[storageKey]
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(ACCOUNT_WITHDRAW_RATE_MAX, Math.max(ACCOUNT_WITHDRAW_RATE_MIN, raw))
  }
  return defaultWithdrawRateForStrategy(strategy)
}

export function monthlyPrincipalDraw(
  balance: number,
  withdrawRate: number,
  inflationAdj: number,
): number {
  if (balance <= 0 || withdrawRate <= 0) return 0
  return (balance * withdrawRate * (1 + inflationAdj)) / 12
}

const RUNWAY_MAX_YEARS = 100
const RUNWAY_BALANCE_EPSILON = 0.01

function roundRunwayYears(years: number): number {
  return Math.round(years * 10) / 10
}

/** One decimal place for runway UI (e.g. 9.7 years). */
export function formatRunwayYearsDisplay(years: number): string {
  return years.toFixed(1)
}

/** Color tone for the years value only (25+ / 15–24 / under 15). */
export function runwayYearsToneClass(years: number): string {
  if (years >= 25) return 'runway-years--strong'
  if (years >= 15) return 'runway-years--caution'
  return 'runway-years--at-risk'
}

/** Annual NAV erosion rate (0–1) from security catalog risk tier. */
export function navErosionRateFromSecurity(security: IncomeSecurity | undefined): number {
  if (!security) return 0
  return navDriftFromErosionRisk(security.nav_erosion_risk)
}

/** Fixed initial annual draw with inflation escalation each year. */
export function inflatingDrawRunwayYears(
  projectedBalance: number,
  initialAnnualDraw: number,
  inflationAdj: number,
): number | null {
  if (projectedBalance <= 0 || initialAnnualDraw <= 0) return null

  let balance = projectedBalance
  let annualDraw = initialAnnualDraw
  const inflationMultiplier = 1 + inflationAdj
  let years = 0

  while (balance > RUNWAY_BALANCE_EPSILON && years < RUNWAY_MAX_YEARS) {
    if (annualDraw >= balance) {
      years += balance / annualDraw
      return roundRunwayYears(years)
    }
    balance -= annualDraw
    annualDraw *= inflationMultiplier
    years += 1
  }

  if (years >= RUNWAY_MAX_YEARS) return RUNWAY_MAX_YEARS
  return roundRunwayYears(years)
}

/** Withdraw-only: principal depletion from withdrawal rate (no NAV erosion). */
export function withdrawOnlyRunwayYears(
  projectedBalance: number,
  withdrawRate: number,
  inflationAdj: number,
): number | null {
  if (projectedBalance <= 0 || withdrawRate <= 0) return null
  return inflatingDrawRunwayYears(
    projectedBalance,
    projectedBalance * withdrawRate,
    inflationAdj,
  )
}

/** Both: principal draw plus NAV erosion on the declining balance each year. */
export function bothStrategyRunwayYears(
  projectedBalance: number,
  withdrawRate: number,
  navErosionRate: number,
  inflationAdj: number,
): number | null {
  if (projectedBalance <= 0 || withdrawRate <= 0) return null

  let balance = projectedBalance
  let annualPrincipalDraw = projectedBalance * withdrawRate
  const inflationMultiplier = 1 + inflationAdj
  const navRate = Math.max(0, navErosionRate)
  let years = 0

  while (balance > RUNWAY_BALANCE_EPSILON && years < RUNWAY_MAX_YEARS) {
    const annualBalanceReduction = annualPrincipalDraw + balance * navRate
    if (annualBalanceReduction >= balance) {
      years += balance / annualBalanceReduction
      return roundRunwayYears(years)
    }
    balance -= annualBalanceReduction
    annualPrincipalDraw *= inflationMultiplier
    years += 1
  }

  if (years >= RUNWAY_MAX_YEARS) return RUNWAY_MAX_YEARS
  return roundRunwayYears(years)
}

/** Years until principal is depleted at escalating real draws (+ optional NAV drift). */
export function principalRunwayYears(
  balance: number,
  annualPrincipalDraw: number,
  inflationAdj: number,
  navDriftAnnual = 0,
): number | null {
  if (balance <= 0 || annualPrincipalDraw <= 0) return null
  if (navDriftAnnual > 0) {
    const withdrawRate = annualPrincipalDraw / balance
    return bothStrategyRunwayYears(balance, withdrawRate, navDriftAnnual, inflationAdj)
  }
  return inflatingDrawRunwayYears(balance, annualPrincipalDraw, inflationAdj)
}

function navDriftForSecurity(security: IncomeSecurity | undefined): number {
  return navErosionRateFromSecurity(security)
}

function hasNavErosionRisk(security: IncomeSecurity | undefined): boolean {
  if (!security) return false
  return navDriftFromErosionRisk(security.nav_erosion_risk) > 0
}

export function computeAccountIncomeBreakdown(args: {
  line: AccountIncomeLine
  balanceAtRetirement: number
  strategy: AccountIncomeStrategy
  withdrawRate: number
  inflationAdj: number
  accountIncomeFunds: Record<string, string>
  medicalAnnualDraw?: number
}): AccountIncomeBreakdown {
  const {
    line,
    balanceAtRetirement,
    strategy,
    withdrawRate,
    inflationAdj,
    accountIncomeFunds,
    medicalAnnualDraw = 0,
  } = args

  const ticker = resolveAccountIncomeFundTicker(line.storageKey, line.bucket, accountIncomeFunds)
  const security = findIncomeSecurity(ticker)
  const yieldPct = security?.yield_est ?? 0
  const navDrift = navDriftForSecurity(security)

  let monthlyDividend = 0
  let monthlyWithdraw = 0
  let preservedBalance: number | null = null

  if (strategy === 'none') {
    // No income from this account until user enables a strategy.
  } else if (strategy === 'dividend') {
    monthlyDividend = monthlyIncomeFromFund(balanceAtRetirement, yieldPct)
  } else if (strategy === 'withdraw') {
    if (line.bucket === 'hsa') {
      const medicalAnnual = Math.min(medicalAnnualDraw, balanceAtRetirement)
      monthlyWithdraw = medicalAnnual / 12
      preservedBalance = Math.max(0, balanceAtRetirement - medicalAnnual)
    } else {
      monthlyWithdraw = monthlyPrincipalDraw(balanceAtRetirement, withdrawRate, inflationAdj)
    }
  } else {
    monthlyDividend = monthlyIncomeFromFund(balanceAtRetirement, yieldPct)
    monthlyWithdraw = monthlyPrincipalDraw(balanceAtRetirement, withdrawRate, inflationAdj)
  }

  const monthlyTotal = monthlyDividend + monthlyWithdraw
  const annualWithdraw = monthlyWithdraw * 12

  let runwayYears: number | null = null
  const projectedBalance = balanceAtRetirement
  if (projectedBalance > 0 && Number.isFinite(projectedBalance)) {
    if (strategy === 'withdraw') {
      if (line.bucket === 'hsa') {
        const medicalAnnual = Math.min(medicalAnnualDraw, projectedBalance)
        runwayYears = inflatingDrawRunwayYears(projectedBalance, medicalAnnual, inflationAdj)
      } else {
        runwayYears = withdrawOnlyRunwayYears(projectedBalance, withdrawRate, inflationAdj)
      }
    } else if (strategy === 'both') {
      runwayYears = bothStrategyRunwayYears(
        projectedBalance,
        withdrawRate,
        navErosionRateFromSecurity(security),
        inflationAdj,
      )
    }
  }

  const ratePct = (withdrawRate * 100).toFixed(1)

  let strategyBadgeLabel = 'No strategy selected'
  let collapsedSubtext = 'Select income strategy'

  if (strategy !== 'none') {
    const strategyName =
      strategy === 'dividend' ? 'Dividend' : strategy === 'withdraw' ? 'Withdraw' : 'Both'

    let strategyConfig = ''
    if (strategy === 'dividend') {
      strategyConfig = security ? `${ticker} ${formatSecurityYieldPct(yieldPct)}` : 'Select fund'
    } else if (strategy === 'withdraw') {
      strategyConfig = line.bucket === 'hsa' ? 'Medical draw' : `${ratePct}%`
    } else {
      strategyConfig = security ? `${ticker} + ${ratePct}%` : `${ratePct}%`
    }
    strategyBadgeLabel = `${strategyName} · ${strategyConfig}`

    collapsedSubtext = strategyConfig
    if (strategy === 'withdraw' && line.bucket !== 'hsa') {
      collapsedSubtext = `${ratePct}% withdrawal rate`
    } else if (strategy === 'both' && security) {
      collapsedSubtext = `${ticker} ${formatSecurityYieldPct(yieldPct)} + ${ratePct}% draw`
    }
  }

  return {
    strategy,
    monthlyTotal,
    monthlyDividend,
    monthlyWithdraw,
    annualWithdraw,
    yieldPct: strategy === 'none' || (strategy === 'withdraw' && line.bucket === 'hsa') ? null : yieldPct,
    withdrawRate: strategy === 'none' || strategy === 'dividend' ? null : withdrawRate,
    fundTicker: strategy === 'none' || strategy === 'withdraw' ? null : ticker,
    fundLabel: security?.name ?? null,
    runwayYears,
    navDriftPct: hasNavErosionRisk(security) ? navDrift * 100 : null,
    preservedBalance,
    collapsedSubtext,
    strategyBadgeLabel,
  }
}

export function navErosionRunwayNote(
  ticker: string,
  navDriftPct: number,
): string {
  return `${ticker} carries ~${navDriftPct.toFixed(1)}% annual NAV drift which is factored into the runway estimate`
}
