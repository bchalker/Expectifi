import type { AccountScenarioBucketId } from './accountReturnScenario'
import {
  canonicalIncomeStorageKeyForBucket,
  canonicalIncomeStorageKeyForEntry,
  canonicalIncomeStorageKeyForManualId,
} from './accountIncomeStorage'
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
  activeManualAccountEntries,
  deriveManualAccountEntriesFromBalances,
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

/** Same manual rows as income-mode AccountBalances (stored or derived from balances). */
export function resolveIncomeManualAccountEntries(
  retirementBalanceMode: 'manual' | 'imported',
  inputs: CalculatorInputs,
  brkBal: number,
  manualEntries?: ManualAccountEntry[],
): ManualAccountEntry[] {
  if (manualEntries !== undefined) {
    return manualEntries.filter((entry) => entry.type != null && entry.balance > 0)
  }
  const storedActive = activeManualAccountEntries(loadStoredManualAccounts())
  if (storedActive.length > 0) return storedActive
  if (retirementBalanceMode !== 'manual') return []
  return deriveManualAccountEntriesFromBalances(
    {
      bal401k: inputs.base401k,
      balSE401k: inputs.baseSE401k,
      balTradIRA: inputs.baseTradIRA,
      balRoth: inputs.baseRoth,
      balHsa: inputs.baseHsa,
    },
    brkBal,
  ).filter((entry) => entry.type != null && entry.balance > 0)
}

export type AccountBucketBalanceSnapshot = {
  pretax: number
  roth: number
  hsa: number
  brokerage: number
  hasRothAccount: boolean
}

/** Bucket totals aligned with income-mode Retirement Account Balances rows. */
export function resolveAccountBucketBalancesFromIncomeLines(
  ctx: AccountIncomeMonthlyContext,
): AccountBucketBalanceSnapshot {
  const lines = listAccountIncomeLines(ctx)
  const bucketTotal = (bucket: AccountScenarioBucketId): number => {
    const line = lines.find((entry) => entry.bucket === bucket)
    return line?.bucketCurrentTotal ?? 0
  }

  return {
    pretax: bucketTotal('pretax'),
    roth: bucketTotal('roth'),
    hsa: bucketTotal('hsa'),
    brokerage: bucketTotal('brokerage'),
    hasRothAccount: lines.some((entry) => entry.bucket === 'roth'),
  }
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

  const entries = resolveIncomeManualAccountEntries(
    retirementBalanceMode,
    inputs,
    ctx.brkBal,
    manualEntries,
  )

  if (retirementBalanceMode === 'manual' && entries.length > 0) {
    const bucketTotals = manualEntryBucketTotals(entries)
    for (const step of seq) {
      if (!localeSupportsWithdrawalBucket(locale, step)) continue
      for (const entry of entries) {
        if (entry.type == null) continue
        const meta = getAccountTypeMeta(entry.type, locale)
        if (meta.withdrawalBucket !== step) continue
        lines.push({
          storageKey: canonicalIncomeStorageKeyForEntry(entry),
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
        storageKey: canonicalIncomeStorageKeyForBucket('brokerage'),
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
            storageKey: canonicalIncomeStorageKeyForManualId(part.key),
            bucket: 'pretax',
            currentBalance: part.balance,
            bucketCurrentTotal: pretaxTotal,
          })
        }
      } else {
        lines.push({
          storageKey: canonicalIncomeStorageKeyForBucket('pretax'),
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
            ? canonicalIncomeStorageKeyForManualId('roth')
            : canonicalIncomeStorageKeyForBucket('roth'),
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
            ? canonicalIncomeStorageKeyForManualId('hsa')
            : canonicalIncomeStorageKeyForBucket('hsa'),
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

/** True when the user has explicitly enabled dividend, withdraw, or both on at least one account row. */
export function hasAnyAccountIncomeStrategySelected(
  ctx: AccountIncomeMonthlyContext,
): boolean {
  if (!ctx.hasPortfolioBalances) return false
  for (const line of listAccountIncomeLines(ctx)) {
    const raw = ctx.accountIncomeStrategies[line.storageKey]
    if (raw === 'dividend' || raw === 'withdraw' || raw === 'both') return true
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
