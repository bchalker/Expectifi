import {
  ALL_EXPECTIFI_PLAN_KEYS,
  EXPECTIFI_PROFILE_KEY,
  LEGACY_USER_PREFS_KEY,
  LEGACY_USER_PREFS_KEYS,
  LEGACY_WELCOME_COMPLETED_KEY,
  LEGACY_WELCOME_COMPLETED_KEYS,
} from './keys'
import { removeFromLocalStorage } from './storageUtils'
import { tierIsAuthenticated } from './resolveTier'
import { getPlanWriteTier } from './writeContext'
import {
  USER_PREFS_STORAGE_KEY,
  WELCOME_COMPLETED_STORAGE_KEY,
} from '../userPrefs'
import { clearGuestWhereToRetireStorage } from '../whereToRetire/storage'
import { EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY } from './keys'

const GUEST_OPEN_TABS_KEY = 'expectifi_guest_open_tabs'
const LEGACY_GUEST_TABS_KEY = 'headwayplanner_guest_open_tabs'

/**
 * Guests may only keep onboarding profile in localStorage.
 * Remove session, accounts, income UI, and other plan blobs.
 */
export function purgeGuestNonProfilePlanStorage(): void {
  for (const key of ALL_EXPECTIFI_PLAN_KEYS) {
    if (key === EXPECTIFI_PROFILE_KEY) continue
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
    localStorage.removeItem(EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY)
  } catch {
    /* ignore */
  }
  clearGuestWhereToRetireStorage()
}

/** Guests: keep onboarding profile only. Signed-in: no purge here. */
export function purgeUnconsentedPlanStorage(): void {
  if (tierIsAuthenticated(getPlanWriteTier())) return
  purgeGuestNonProfilePlanStorage()
}
