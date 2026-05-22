import type { BrokerageBalanceMode } from './brokerageBalanceMode'
import type { CalculatorInputs } from './computeResults'
import type { BalanceInputMode } from './retirementBalanceMode'
import { loadStoredFidelityImport } from './fidelityStorage'
import { storedManualAccountsHaveBalances } from './manualAccountEntries'

export const MANUAL_REMOVED_ON_CONNECT_MSG =
  'Your manual amounts will be removed when you import or connect accounts.'

/** Shown on CSV import preview; user must check before confirming. */
export const CSV_IMPORT_MANUAL_ACK_MSG =
  'I understand the manual amounts I have added previously will be removed when I import this.'

export const IMPORT_REMOVED_ON_MANUAL_MSG =
  'Your imported and linked account data will be removed when you save manual amounts.'

export type PortfolioBalanceModes = {
  retirement: BalanceInputMode
  brokerage: BrokerageBalanceMode
}

export function hasManualPortfolioAmounts(
  inputs: Pick<
    CalculatorInputs,
    'base401k' | 'baseSE401k' | 'baseTradIRA' | 'baseRoth' | 'baseHsa' | 'brkBal'
  >,
  modes: PortfolioBalanceModes,
): boolean {
  if (storedManualAccountsHaveBalances()) return true
  if (modes.retirement === 'manual') {
    const ret =
      inputs.base401k +
      inputs.baseSE401k +
      inputs.baseTradIRA +
      inputs.baseRoth +
      inputs.baseHsa
    if (ret > 0) return true
  }
  if (modes.brokerage === 'manual' && inputs.brkBal > 0) return true
  return false
}

export function hasImportedPortfolioData(): boolean {
  const imp = loadStoredFidelityImport()
  return Boolean(imp?.batches?.some((b) => b.rows.length > 0))
}
