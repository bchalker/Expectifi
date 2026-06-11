import { EXPECTIFI_PLAN_STATE_LOCAL_SAVED_AT_KEY } from './keys'
import {
  readJsonFromLocalStorage,
  removeFromLocalStorage,
  writeJsonToLocalStorage,
} from './storageUtils'

/** ISO timestamp of the last local plan-state write (session/profile/accounts). */
export function touchLocalPlanStateSavedAt(iso = new Date().toISOString()): void {
  writeJsonToLocalStorage(EXPECTIFI_PLAN_STATE_LOCAL_SAVED_AT_KEY, iso)
}

export function loadLocalPlanStateSavedAt(): string | null {
  const raw = readJsonFromLocalStorage<unknown>(EXPECTIFI_PLAN_STATE_LOCAL_SAVED_AT_KEY)
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function clearLocalPlanStateSavedAt(): void {
  removeFromLocalStorage(EXPECTIFI_PLAN_STATE_LOCAL_SAVED_AT_KEY)
}
