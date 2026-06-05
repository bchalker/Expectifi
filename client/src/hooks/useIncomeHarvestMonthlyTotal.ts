import { useMemo } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { ComputedSnapshot } from '../lib/computeResults'
import {
  hasAnyAccountIncomeStrategySelected,
  monthlyPortfolioIncomeFromAccountStrategies,
  resolveIncomeManualAccountEntries,
} from '../lib/accountIncomeMonthly'
import type { AccountIncomeStrategy } from '../lib/accountIncomeStrategy'
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

export type IncomeHarvestMonthlyResult = {
  /** Same total as income-mode account list footer (AccountBalances). */
  monthlyTotal: number
  hasStrategiesSelected: boolean
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
}: Args): IncomeHarvestMonthlyResult {
  const locale = resolveOnboardingAccountLocale()
  const manualEntries = useMemo(() => {
    void manualAccountsRev
    return resolveIncomeManualAccountEntries(balanceMode, inputs, brkBal)
  }, [
    manualAccountsRev,
    balanceMode,
    inputs.base401k,
    inputs.baseSE401k,
    inputs.baseTradIRA,
    inputs.baseRoth,
    inputs.baseHsa,
    brkBal,
  ])

  const retirementAge = inputs.targetRetirementAge ?? c.targetRetirementAge

  return useMemo((): IncomeHarvestMonthlyResult => {
    const ctx = {
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
    }
    if (!enabled || !c.hasPortfolioBalances) {
      return { monthlyTotal: 0, hasStrategiesSelected: false }
    }
    return {
      monthlyTotal: monthlyPortfolioIncomeFromAccountStrategies(ctx),
      hasStrategiesSelected: hasAnyAccountIncomeStrategySelected(ctx),
    }
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
