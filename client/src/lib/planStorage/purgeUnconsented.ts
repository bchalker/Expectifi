import {
  ALL_EXPECTIFI_PLAN_KEYS,
  LEGACY_USER_PREFS_KEY,
  LEGACY_USER_PREFS_KEYS,
  LEGACY_WELCOME_COMPLETED_KEY,
  LEGACY_WELCOME_COMPLETED_KEYS,
} from './keys'
import { hasSavePlanBeenAccepted } from './meta'
import { removeFromLocalStorage } from './storageUtils'
import {
  USER_PREFS_STORAGE_KEY,
  WELCOME_COMPLETED_STORAGE_KEY,
} from '../userPrefs'

const GUEST_OPEN_TABS_KEY = 'expectifi_guest_open_tabs'
const LEGACY_GUEST_TABS_KEY = 'headwayplanner_guest_open_tabs'

/**
 * Remove expectifi plan blobs written without an explicit "Save my plan" accept.
 * Tier-1 "Not now" must leave zero plan localStorage.
 */
export function purgeUnconsentedPlanStorage(): void {
  if (hasSavePlanBeenAccepted()) return
  for (const key of ALL_EXPECTIFI_PLAN_KEYS) {
    removeFromLocalStorage(key)
  }
  removeFromLocalStorage(USER_PREFS_STORAGE_KEY)
  removeFromLocalStorage(WELCOME_COMPLETED_STORAGE_KEY)
  removeFromLocalStorage(LEGACY_USER_PREFS_KEY)
  removeFromLocalStorage(LEGACY_WELCOME_COMPLETED_KEY)
  for (const key of LEGACY_USER_PREFS_KEYS) {
    removeFromLocalStorage(key)
  }
  for (const key of LEGACY_WELCOME_COMPLETED_KEYS) {
    removeFromLocalStorage(key)
  }
  try {
    localStorage.removeItem(GUEST_OPEN_TABS_KEY)
    localStorage.removeItem(LEGACY_GUEST_TABS_KEY)
  } catch {
    /* ignore */
  }
}
