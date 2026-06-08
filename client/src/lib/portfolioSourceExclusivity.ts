import type { BrokerageBalanceMode } from './brokerageBalanceMode'
import { loadBrokerageBalanceMode } from './brokerageBalanceMode'
import type { CalculatorInputs } from './computeResults'
import { loadStoredPositionsImport } from './positionsImportStorage'
import { storedManualAccountsHaveBalances } from './manualAccountEntries'
import { loadBalanceInputMode, type BalanceInputMode } from './retirementBalanceMode'

export const MANUAL_REMOVED_ON_CONNECT_MSG =
  'Your manual amounts will be removed when you import or connect accounts.'

/** Shown on CSV import preview; user must check before confirming. */
export const CSV_IMPORT_MANUAL_ACK_MSG =
  'I understand the manual accounts I have added will clear when I import this.'

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
  const imp = loadStoredPositionsImport()
  if (!imp) return false
  if (imp.batches?.some((b) => b.rows.length > 0)) return true
  const b = imp.balances
  if (!b) return false
  return b.base401k + b.baseSE401k + b.baseRoth + b.baseHsa + b.brkBal > 0
}

/**
 * Dashboard display mode: stay on imported UI when CSV/Plaid data exists and manual
 * account rows were cleared (e.g. replace-manual import applied balances but mode lagged).
 */
export function resolvePortfolioBalanceMode(mode: BalanceInputMode): BalanceInputMode {
  if (hasImportedPortfolioData()) return 'imported'
  if (mode === 'imported') return 'imported'
  return mode
}

export type ImportedPortfolioBalances = Pick<
  CalculatorInputs,
  'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'
>

export type PortfolioBalanceFields = Pick<
  CalculatorInputs,
  'base401k' | 'baseSE401k' | 'baseTradIRA' | 'baseRoth' | 'baseHsa' | 'brkBal'
>

/** Replace manual portfolio buckets with import totals; clears Trad IRA (manual-only bucket). */
export function portfolioBalancesFromImport(
  balances: ImportedPortfolioBalances,
): PortfolioBalanceFields {
  return {
    base401k: balances.base401k,
    baseSE401k: balances.baseSE401k,
    baseTradIRA: 0,
    baseRoth: balances.baseRoth,
    baseHsa: balances.baseHsa,
    brkBal: balances.brkBal,
  }
}

/** Overlay stored CSV/Plaid totals onto calculator inputs when fidelity mode is active. */
export function applyImportedBalanceOverrides(inputs: CalculatorInputs): CalculatorInputs {
  const imp = loadStoredPositionsImport()
  if (!imp?.balances) return inputs
  const rabMode = loadBalanceInputMode()
  const brkMode = loadBrokerageBalanceMode()
  const d = { ...inputs }
  if (rabMode === 'imported') {
    d.base401k = imp.balances.base401k
    d.baseSE401k = imp.balances.baseSE401k
    d.baseRoth = imp.balances.baseRoth
    d.baseHsa = imp.balances.baseHsa
    d.baseTradIRA = 0
  }
  if (brkMode === 'imported' || rabMode === 'imported') {
    d.brkBal = imp.balances.brkBal
  }
  return d
}
