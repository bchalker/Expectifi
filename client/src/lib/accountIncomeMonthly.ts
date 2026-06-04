import type { AccountScenarioBucketId } from './accountReturnScenario'
import {
  accountIncomeFundStorageKey,
} from './accountIncomeFund'
import {
  accountRetirementBalance,
  type AccountRetirementFvSnapshot,
} from './accountBucketRetirementBalance'
import {
  computeAccountIncomeBreakdown,
  resolveAccountIncomeStrategy,
  resolveAccountWithdrawRate,
  type AccountIncomeStrategy,
} from './accountIncomeStrategy'
import type { CalculatorInputs } from './computeResults'
import { localeSupportsWithdrawalBucket } from '../config/taxConfig'
import {
  getAccountTypeMeta,
  loadStoredManualAccounts,
  type ManualAccountEntry,
} from './manualAccountEntries'
import { resolveOnboardingAccountLocale } from './onboardingAccountTypesByLocale'
import type { OnboardingRegionId } from './onboardingRegions'
import { withdrawalBucketOrder } from './withdrawalDisplayOrder'

export type AccountIncomeLine = {
  storageKey: string
  bucket: AccountScenarioBucketId
  currentBalance: number
  bucketCurrentTotal: number
}

export type AccountIncomeMonthlyContext = {
  inputs: CalculatorInputs
  accountIncomeFunds: Record<string, string>
  accountIncomeStrategies: Record<string, AccountIncomeStrategy>
  accountWithdrawRates: Record<string, number>
  wdInflation: number
  /** HSA qualified medical draw (annual, strategy split). */
  hsaMedicalAnnualDraw?: number
  hasPortfolioBalances: boolean
  retFV: number
  brkFV: number
  tradRatio: number
  rothRatio: number
  hsaRatio: number
  tradBal: number
  rothBal: number
  hsaBal: number
  brkBal: number
  retirementAge: number
  locale?: OnboardingRegionId
  /** When manual onboarding entries exist, use per-account rows; else bucket totals. */
  manualEntries?: ManualAccountEntry[]
  retirementBalanceMode?: 'manual' | 'imported'
}

function pretaxCurrentTotal(inputs: CalculatorInputs): number {
  return inputs.base401k + inputs.baseSE401k + inputs.baseTradIRA
}

function manualEntryBucketTotals(entries: ManualAccountEntry[]): Partial<Record<AccountScenarioBucketId, number>> {
  const totals: Partial<Record<AccountScenarioBucketId, number>> = {}
  for (const entry of entries) {
    if (entry.type == null || entry.balance <= 0) continue
    const bucket = getAccountTypeMeta(entry.type, resolveOnboardingAccountLocale()).withdrawalBucket
    totals[bucket] = (totals[bucket] ?? 0) + entry.balance
  }
  return totals
}

/** Account lines mirrored from income-mode AccountBalances row list. */
export function listAccountIncomeLines(ctx: AccountIncomeMonthlyContext): AccountIncomeLine[] {
  const {
    inputs,
    hasPortfolioBalances,
    retirementAge,
    locale = resolveOnboardingAccountLocale(),
    manualEntries,
    retirementBalanceMode = 'manual',
  } = ctx

  if (!hasPortfolioBalances) return []

  const lines: AccountIncomeLine[] = []
  const seq = withdrawalBucketOrder(retirementAge, true, locale)
  const pretaxTotal = pretaxCurrentTotal(inputs)

  const entries =
    manualEntries ??
    (() => {
      const stored = loadStoredManualAccounts()
      if (!stored?.onboardingCompleted) return [] as ManualAccountEntry[]
      return stored.entries.filter((e) => e.balance > 0)
    })()

  if (retirementBalanceMode === 'manual' && entries.length > 0) {
    const bucketTotals = manualEntryBucketTotals(entries)
    for (const step of seq) {
      if (!localeSupportsWithdrawalBucket(locale, step)) continue
      for (const entry of entries) {
        if (entry.type == null) continue
        const meta = getAccountTypeMeta(entry.type, locale)
        if (meta.withdrawalBucket !== step) continue
        lines.push({
          storageKey: accountIncomeFundStorageKey('manual', entry.id),
          bucket: meta.withdrawalBucket,
          currentBalance: entry.balance,
          bucketCurrentTotal: bucketTotals[meta.withdrawalBucket] ?? entry.balance,
        })
      }
    }
    return lines
  }

  for (const step of seq) {
    if (!localeSupportsWithdrawalBucket(locale, step)) continue
    if (step === 'brokerage') {
      if (ctx.brkBal <= 0) continue
      lines.push({
        storageKey: accountIncomeFundStorageKey('bucket', 'brokerage'),
        bucket: 'brokerage',
        currentBalance: ctx.brkBal,
        bucketCurrentTotal: ctx.brkBal,
      })
      continue
    }
    if (pretaxTotal <= 0 && ctx.rothBal <= 0 && ctx.hsaBal <= 0) continue
    if (step === 'pretax' && pretaxTotal > 0) {
      if (retirementBalanceMode === 'manual') {
        const parts: { key: string; balance: number }[] = [
          { key: 'ret401k', balance: inputs.base401k },
          { key: 'se401k', balance: inputs.baseSE401k },
          { key: 'tradIra', balance: inputs.baseTradIRA },
        ].filter((p) => p.balance > 0)
        for (const part of parts) {
          lines.push({
            storageKey: accountIncomeFundStorageKey('manual', part.key),
            bucket: 'pretax',
            currentBalance: part.balance,
            bucketCurrentTotal: pretaxTotal,
          })
        }
      } else {
        lines.push({
          storageKey: accountIncomeFundStorageKey('bucket', 'pretax'),
          bucket: 'pretax',
          currentBalance: pretaxTotal,
          bucketCurrentTotal: pretaxTotal,
        })
      }
      continue
    }
    if (step === 'roth' && ctx.rothBal > 0) {
      lines.push({
        storageKey:
          retirementBalanceMode === 'manual'
            ? accountIncomeFundStorageKey('manual', 'roth')
            : accountIncomeFundStorageKey('bucket', 'roth'),
        bucket: 'roth',
        currentBalance: ctx.rothBal,
        bucketCurrentTotal: ctx.rothBal,
      })
      continue
    }
    if (step === 'hsa' && ctx.hsaBal > 0) {
      lines.push({
        storageKey:
          retirementBalanceMode === 'manual'
            ? accountIncomeFundStorageKey('manual', 'hsa')
            : accountIncomeFundStorageKey('bucket', 'hsa'),
        bucket: 'hsa',
        currentBalance: ctx.hsaBal,
        bucketCurrentTotal: ctx.hsaBal,
      })
    }
  }

  return lines
}

function snapshotFromContext(ctx: AccountIncomeMonthlyContext) {
  return {
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
}

/** True when at least one account row has dividend, withdraw, or both enabled. */
export function hasAnyAccountIncomeStrategySelected(
  ctx: AccountIncomeMonthlyContext,
): boolean {
  if (!ctx.hasPortfolioBalances) return false
  for (const line of listAccountIncomeLines(ctx)) {
    const raw = ctx.accountIncomeStrategies[line.storageKey]
    if (raw === 'dividend' || raw === 'withdraw' || raw === 'both') return true
    const strategy = resolveAccountIncomeStrategy(
      line.storageKey,
      line.bucket,
      ctx.accountIncomeStrategies,
    )
    if (strategy !== 'none') return true
  }
  return false
}

/** Balance at retirement for income draw; falls back to current balance when FV is unavailable. */
export function incomeBalanceForProjection(
  line: AccountIncomeLine,
  snapshot: AccountRetirementFvSnapshot,
  brkBal: number,
): number {
  const bucketTotal =
    line.bucketCurrentTotal > 0 ? line.bucketCurrentTotal : line.currentBalance
  const atRetirement = accountRetirementBalance(
    line.bucket,
    line.currentBalance,
    bucketTotal,
    snapshot,
  )
  if (atRetirement > 0) return atRetirement
  if (line.currentBalance > 0) return line.currentBalance
  if (line.bucket === 'brokerage' && brkBal > 0) return brkBal
  return 0
}

/** Sum of per-account income (matches income-mode account rows). */
export function monthlyPortfolioIncomeFromAccountStrategies(ctx: AccountIncomeMonthlyContext): number {
  if (!ctx.hasPortfolioBalances) return 0

  const snapshot = snapshotFromContext(ctx)
  let total = 0

  for (const line of listAccountIncomeLines(ctx)) {
    const atRetirement = incomeBalanceForProjection(line, snapshot, ctx.brkBal)
    const strategy = resolveAccountIncomeStrategy(
      line.storageKey,
      line.bucket,
      ctx.accountIncomeStrategies,
    )
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
    total += breakdown.monthlyTotal
  }

  return total
}

/** @deprecated Use monthlyPortfolioIncomeFromAccountStrategies. */
export function monthlyPortfolioIncomeFromAccountFunds(ctx: AccountIncomeMonthlyContext): number {
  return monthlyPortfolioIncomeFromAccountStrategies(ctx)
}
