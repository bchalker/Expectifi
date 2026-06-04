import { loadStoredPositionsImport } from './positionsImportStorage'
import { getPlanWriteTier } from './planStorage/writeContext'

export const BALANCE_INPUT_MODE_KEY = 'retirement-calculator/balance-input-mode'

export type BalanceInputMode = 'manual' | 'imported'

function balanceModeStorage(): Storage {
  const tier = getPlanWriteTier()
  if (tier === 'authenticated_free' || tier === 'pro') return localStorage
  return sessionStorage
}

export function loadBalanceInputMode(): BalanceInputMode {
  try {
    const raw = balanceModeStorage().getItem(BALANCE_INPUT_MODE_KEY)
    if (raw === 'manual' || raw === 'imported') return raw
    if (raw === 'fidelity') return 'imported'
  } catch {
    /* ignore */
  }
  const imp = loadStoredPositionsImport()
  if (imp?.batches?.length) return 'imported'
  return 'manual'
}

export function saveBalanceInputMode(mode: BalanceInputMode) {
  try {
    const store = balanceModeStorage()
    store.setItem(BALANCE_INPUT_MODE_KEY, mode)
    if (balanceModeStorage() === sessionStorage) {
      localStorage.removeItem(BALANCE_INPUT_MODE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function clearBalanceInputModeStorage(): void {
  try {
    localStorage.removeItem(BALANCE_INPUT_MODE_KEY)
    sessionStorage.removeItem(BALANCE_INPUT_MODE_KEY)
  } catch {
    /* ignore */
  }
}
