import { calcTaxDetailed, type TaxDetailedResult } from 'shared'
import { accountRetirementBalance } from './accountBucketRetirementBalance'
import { findIncomeSecurity } from './incomeSecurities'
import type { FilingStatusId } from './filingStatus'
import {
  listAccountIncomeLines,
  type AccountIncomeMonthlyContext,
} from './accountIncomeMonthly'
import type { AccountScenarioBucketId } from './accountReturnScenario'

export type AccountIncomeTaxBuckets = {
  tradWd: number
  rothWd: number
  hsaWd: number
  brkWd: number
}

/** Stored fund selection only — ignores catalog defaults used for row display. */
export function storedIncomeFundTicker(
  storageKey: string,
  accountIncomeFunds: Record<string, string>,
): string | null {
  const raw = accountIncomeFunds[storageKey]
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toLowerCase() === 'none') return null
  return trimmed
}

export function isDividendIncomeActiveForTax(
  storageKey: string,
  accountIncomeFunds: Record<string, string>,
): boolean {
  return storedIncomeFundTicker(storageKey, accountIncomeFunds) != null
}

/** Withdraw rate from persisted input only; empty or missing is 0. */
export function withdrawRateFromInput(
  storageKey: string,
  accountWithdrawRates: Record<string, number> | undefined,
): number {
  const raw = accountWithdrawRates?.[storageKey]
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 0
  return raw
}

export function isWithdrawIncomeActiveForTax(
  storageKey: string,
  bucket: AccountScenarioBucketId,
  accountWithdrawRates: Record<string, number> | undefined,
  medicalAnnualDraw = 0,
): boolean {
  if (bucket === 'hsa') return medicalAnnualDraw > 0
  return withdrawRateFromInput(storageKey, accountWithdrawRates) > 0
}

export function isAccountIncomeActiveForTax(
  storageKey: string,
  bucket: AccountScenarioBucketId,
  accountIncomeFunds: Record<string, string>,
  accountWithdrawRates: Record<string, number> | undefined,
  medicalAnnualDraw = 0,
): boolean {
  return (
    isDividendIncomeActiveForTax(storageKey, accountIncomeFunds) ||
    isWithdrawIncomeActiveForTax(storageKey, bucket, accountWithdrawRates, medicalAnnualDraw)
  )
}

function annualDividendFromStoredFund(
  projectedBalance: number,
  storageKey: string,
  accountIncomeFunds: Record<string, string>,
): number {
  const ticker = storedIncomeFundTicker(storageKey, accountIncomeFunds)
  if (!ticker || projectedBalance <= 0) return 0
  const security = findIncomeSecurity(ticker)
  const yieldPct = security?.yield_est ?? 0
  if (yieldPct <= 0) return 0
  return projectedBalance * (yieldPct / 100)
}

function annualWithdrawFromInput(
  projectedBalance: number,
  storageKey: string,
  bucket: AccountScenarioBucketId,
  accountWithdrawRates: Record<string, number> | undefined,
  medicalAnnualDraw: number,
): number {
  if (projectedBalance <= 0) return 0
  if (bucket === 'hsa') {
    if (medicalAnnualDraw <= 0) return 0
    return Math.min(medicalAnnualDraw, projectedBalance)
  }
  const rate = withdrawRateFromInput(storageKey, accountWithdrawRates)
  if (rate <= 0) return 0
  return projectedBalance * rate
}

/** Sum annual withdrawal buckets from accounts with an active dividend fund and/or withdraw input. */
export function aggregateActiveAccountIncomeForTax(
  ctx: AccountIncomeMonthlyContext,
): AccountIncomeTaxBuckets {
  const buckets: AccountIncomeTaxBuckets = {
    tradWd: 0,
    rothWd: 0,
    hsaWd: 0,
    brkWd: 0,
  }

  if (!ctx.hasPortfolioBalances) return buckets

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

  const medicalAnnualDraw = ctx.hsaMedicalAnnualDraw ?? 0

  for (const line of listAccountIncomeLines(ctx)) {
    if (
      !isAccountIncomeActiveForTax(
        line.storageKey,
        line.bucket,
        ctx.accountIncomeFunds,
        ctx.accountWithdrawRates,
        line.bucket === 'hsa' ? medicalAnnualDraw : 0,
      )
    ) {
      continue
    }

    const projectedBalance = accountRetirementBalance(
      line.bucket,
      line.currentBalance,
      line.bucketCurrentTotal,
      snapshot,
    )

    const dividendAnnual = isDividendIncomeActiveForTax(line.storageKey, ctx.accountIncomeFunds)
      ? annualDividendFromStoredFund(projectedBalance, line.storageKey, ctx.accountIncomeFunds)
      : 0

    const withdrawAnnual = isWithdrawIncomeActiveForTax(
      line.storageKey,
      line.bucket,
      ctx.accountWithdrawRates,
      line.bucket === 'hsa' ? medicalAnnualDraw : 0,
    )
      ? annualWithdrawFromInput(
          projectedBalance,
          line.storageKey,
          line.bucket,
          ctx.accountWithdrawRates,
          medicalAnnualDraw,
        )
      : 0

    const annualTotal = dividendAnnual + withdrawAnnual
    if (annualTotal <= 0) continue

    switch (line.bucket) {
      case 'pretax':
        buckets.tradWd += annualTotal
        break
      case 'brokerage':
        buckets.brkWd += annualTotal
        break
      case 'roth':
        buckets.rothWd += annualTotal
        break
      case 'hsa':
        buckets.hsaWd += dividendAnnual + withdrawAnnual
        break
    }
  }

  return buckets
}

export function calcTaxDetailedForAccountStrategies(
  ctx: AccountIncomeMonthlyContext,
  ssMonthly: number,
  filingStatus: FilingStatusId,
): TaxDetailedResult {
  const { tradWd, rothWd, hsaWd, brkWd } = aggregateActiveAccountIncomeForTax(ctx)
  return calcTaxDetailed(tradWd, rothWd, hsaWd, brkWd, ssMonthly, filingStatus)
}
