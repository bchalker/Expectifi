import { positionsForBrokerage } from './positionsCsv'
import { flattenBatches, loadStoredPositionsImport } from './positionsImportStorage'
import { getPlanWriteTier } from './planStorage/writeContext'

export const BROKERAGE_BALANCE_MODE_KEY = 'retirement-calculator/brokerage-balance-mode'

export type BrokerageBalanceMode = 'manual' | 'imported'

function brokerageModeStorage(): Storage {
  const tier = getPlanWriteTier()
  if (tier === 'authenticated_free' || tier === 'pro') return localStorage
  return sessionStorage
}

function hasBrokerageRowsInStorage(): boolean {
  const imp = loadStoredPositionsImport()
  if (!imp?.batches?.length) return false
  return positionsForBrokerage(flattenBatches(imp.batches)).length > 0
}

export function loadBrokerageBalanceMode(): BrokerageBalanceMode {
  try {
    const raw = brokerageModeStorage().getItem(BROKERAGE_BALANCE_MODE_KEY)
    if (raw === 'manual' || raw === 'imported') return raw
    if (raw === 'fidelity') return 'imported'
  } catch {
    /* ignore */
  }
  if (hasBrokerageRowsInStorage()) return 'imported'
  return 'manual'
}

export function saveBrokerageBalanceMode(mode: BrokerageBalanceMode) {
  try {
    const store = brokerageModeStorage()
    store.setItem(BROKERAGE_BALANCE_MODE_KEY, mode)
    if (store === sessionStorage) {
      localStorage.removeItem(BROKERAGE_BALANCE_MODE_KEY)
    }
  } catch {
    /* ignore */
  }
}
