import { loadStoredFidelityImport } from './fidelityStorage'

export const BALANCE_INPUT_MODE_KEY = 'retirement-calculator/balance-input-mode'

export type BalanceInputMode = 'manual' | 'fidelity'

export function loadBalanceInputMode(): BalanceInputMode {
  try {
    const raw = localStorage.getItem(BALANCE_INPUT_MODE_KEY)
    if (raw === 'manual' || raw === 'fidelity') return raw
  } catch {
    /* ignore */
  }
  const imp = loadStoredFidelityImport()
  if (imp?.batches?.length) return 'fidelity'
  return 'manual'
}

export function saveBalanceInputMode(mode: BalanceInputMode) {
  try {
    localStorage.setItem(BALANCE_INPUT_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}
