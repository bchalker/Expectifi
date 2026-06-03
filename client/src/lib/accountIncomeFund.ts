import type { IncomeSecurity } from './incomeSecurities'
import { BOND_CATEGORIES, findIncomeSecurity, INCOME_SECURITIES } from './incomeSecurities'
import type { AccountScenarioBucketId } from './accountReturnScenario'

export type AccountIncomeFundKey = string

export function accountIncomeFundStorageKey(
  kind: 'bucket' | 'manual',
  id: string,
): AccountIncomeFundKey {
  return `${kind}:${id}`
}

/** Lowest NAV-erosion, lowest-yield security in the catalog — default for HSA. */
export function mostConservativeIncomeFundTicker(): string {
  const veryLow = INCOME_SECURITIES.filter((s) => s.nav_erosion_risk === 'Very Low')
  const pool = veryLow.length > 0 ? veryLow : INCOME_SECURITIES
  let pick = pool[0]!
  for (const s of pool) {
    if (s.yield_est < pick.yield_est) pick = s
  }
  return pick.ticker
}

export function defaultIncomeFundTickerForBucket(bucket: AccountScenarioBucketId): string {
  switch (bucket) {
    case 'brokerage':
      return 'SCHD'
    case 'pretax':
    case 'roth':
      return 'JEPQ'
    case 'hsa':
      return mostConservativeIncomeFundTicker()
  }
}

export function resolveAccountIncomeFundTicker(
  key: AccountIncomeFundKey,
  bucket: AccountScenarioBucketId,
  stored: Record<string, string> | undefined,
): string {
  const raw = stored?.[key]?.trim()
  if (raw && findIncomeSecurity(raw)) return raw
  return defaultIncomeFundTickerForBucket(bucket)
}

export function monthlyIncomeFromFund(balance: number, yieldEstPct: number): number {
  if (balance <= 0 || yieldEstPct <= 0) return 0
  return (balance * (yieldEstPct / 100)) / 12
}

export function incomeFundTaxHint(bucket: AccountScenarioBucketId, security: IncomeSecurity): string {
  const cat = security.category
  const coveredCall =
    cat === 'Covered Call' || cat === 'Options Income' || cat === 'YieldMax'
  const dividendEquity =
    cat === 'Dividend Growth' || cat === 'High Dividend' || security.type === 'Stock'
  const bond = BOND_CATEGORIES.has(cat)

  switch (bucket) {
    case 'brokerage':
      if (coveredCall) {
        return 'Options premium (ordinary income); tax-deferred accounts often work better'
      }
      if (bond) return 'Bond interest, taxable as ordinary income in brokerage'
      if (dividendEquity) {
        return 'Qualified dividends, tax efficient in taxable accounts'
      }
      return 'Check qualified vs ordinary dividend treatment in taxable accounts'
    case 'pretax':
      if (coveredCall) return 'Options premium, best held in tax-deferred'
      if (bond) return 'Bond income, taxed on withdrawal from pre-tax accounts'
      return 'Income taxed on withdrawal; focus on after-tax spendable yield'
    case 'roth':
      if (coveredCall) return 'Options premium, ideal in tax-free accounts'
      return 'Tax-free withdrawals, no annual tax drag on distributions'
    case 'hsa':
      if (bond) return 'Stable bond income, suitable for healthcare savings'
      return 'Conservative income, preserve principal for qualified medical expenses'
  }
}
