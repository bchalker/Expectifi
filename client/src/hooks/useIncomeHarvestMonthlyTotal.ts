import { useMemo } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { ComputedSnapshot } from '../lib/computeResults'
import { monthlyPortfolioIncomeFromAccountStrategies } from '../lib/accountIncomeMonthly'
import type { AccountIncomeStrategy } from '../lib/accountIncomeStrategy'
import { loadStoredManualAccounts } from '../lib/manualAccountEntries'
import { resolveOnboardingAccountLocale } from '../lib/onboardingAccountTypesByLocale'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'

type Args = {
  enabled: boolean
  c: ComputedSnapshot
  inputs: CalculatorInputs
  accountIncomeFunds: Record<string, string>
  accountIncomeStrategies: Record<string, AccountIncomeStrategy>
  accountWithdrawRates: Record<string, number>
  balanceMode: BalanceInputMode
  manualAccountsRev: number
  brkBal: number
}

/** Same total as income-mode account list footer (AccountBalances). */
export function useIncomeHarvestMonthlyTotal({
  enabled,
  c,
  inputs,
  accountIncomeFunds,
  accountIncomeStrategies,
  accountWithdrawRates,
  balanceMode,
  manualAccountsRev,
  brkBal,
}: Args): number {
  const locale = resolveOnboardingAccountLocale()
  const manualEntries = useMemo(() => {
    void manualAccountsRev
    const stored = loadStoredManualAccounts()
    if (!stored?.onboardingCompleted) return []
    return stored.entries.filter((e) => e.balance > 0)
  }, [manualAccountsRev])

  const retirementAge = inputs.targetRetirementAge ?? c.targetRetirementAge

  return useMemo(() => {
    if (!enabled || !c.hasPortfolioBalances) return 0
    return monthlyPortfolioIncomeFromAccountStrategies({
      inputs,
      accountIncomeFunds,
      accountIncomeStrategies,
      accountWithdrawRates,
      wdInflation: inputs.wdInflation,
      hsaMedicalAnnualDraw: c.strategy.hsaWdAnn,
      hasPortfolioBalances: c.hasPortfolioBalances,
      retFV: c.retFV,
      brkFV: c.brkFV,
      tradRatio: c.tradRatio,
      rothRatio: c.rothRatio,
      hsaRatio: c.hsaRatio,
      tradBal: c.tradBal,
      rothBal: c.rothBal,
      hsaBal: c.hsaBal,
      brkBal,
      retirementAge,
      locale,
      manualEntries,
      retirementBalanceMode: balanceMode,
    })
  }, [
    enabled,
    c,
    inputs,
    accountIncomeFunds,
    accountIncomeStrategies,
    accountWithdrawRates,
    brkBal,
    retirementAge,
    locale,
    manualEntries,
    balanceMode,
  ])
}
