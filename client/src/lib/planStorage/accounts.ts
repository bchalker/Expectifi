import {
  aggregateManualAccountsToBases,
  type StoredManualAccounts,
} from '../manualAccountEntries'
import { EXPECTIFI_ACCOUNTS_KEY } from './keys'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'

export function loadPlanAccounts(): StoredManualAccounts | null {
  const parsed = readJsonFromLocalStorage<StoredManualAccounts>(EXPECTIFI_ACCOUNTS_KEY)
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return null
  return parsed
}

export function savePlanAccounts(state: StoredManualAccounts): void {
  writeJsonToLocalStorage(EXPECTIFI_ACCOUNTS_KEY, state)
}

export function planAccountsHaveBalances(accounts: StoredManualAccounts | null): boolean {
  if (!accounts?.onboardingCompleted) return false
  const bases = aggregateManualAccountsToBases(accounts.entries)
  const retBal =
    bases.base401k + bases.baseSE401k + bases.baseTradIRA + bases.baseRoth + bases.baseHsa
  return retBal + bases.brkBal > 0
}
