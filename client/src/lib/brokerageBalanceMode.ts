import { positionsForBrokerage } from './fidelityCsv'
import { flattenBatches, loadStoredFidelityImport } from './fidelityStorage'

export const BROKERAGE_BALANCE_MODE_KEY = 'retirement-calculator/brokerage-balance-mode'

export type BrokerageBalanceMode = 'manual' | 'fidelity'

function hasBrokerageRowsInStorage(): boolean {
  const imp = loadStoredFidelityImport()
  if (!imp?.batches?.length) return false
  return positionsForBrokerage(flattenBatches(imp.batches)).length > 0
}

export function loadBrokerageBalanceMode(): BrokerageBalanceMode {
  try {
    const raw = localStorage.getItem(BROKERAGE_BALANCE_MODE_KEY)
    if (raw === 'manual' || raw === 'fidelity') return raw
  } catch {
    /* ignore */
  }
  if (hasBrokerageRowsInStorage()) return 'fidelity'
  return 'manual'
}

export function saveBrokerageBalanceMode(mode: BrokerageBalanceMode) {
  try {
    localStorage.setItem(BROKERAGE_BALANCE_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}
