import { clearStoredAppState } from './appStateStorage'
import { clearStoredFidelityImport } from './fidelityStorage'
import { clearGuestProfileAndSession } from './guestEphemeralStorage'
import { BALANCE_INPUT_MODE_KEY } from './retirementBalanceMode'
import { BROKERAGE_BALANCE_MODE_KEY } from './brokerageBalanceMode'
import {
  FORCE_ONBOARDING_SESSION_KEY,
  ONBOARDING_FROM_SIGNUP_KEY,
} from './welcomeGate'

const LEGACY_FORCE_ONBOARDING_SESSION_KEY = 'headwayplanner_force_onboarding'
const EXCLUDED_COUNTRIES_KEY = 'retirement_excluded_countries'
const FAVORITE_CITIES_KEY = 'retirement_favorite_cities'
const MANUAL_PROJECTIONS_CALLOUT_DISMISSED_KEY =
  'retirement-calculator/manual-projections-callout-dismissed'
const AUTH_INTENT_KEY = 'expectifi_auth_intent'
const LEGACY_AUTH_INTENT_KEYS = ['headwayplanner_auth_intent', 'eggspectifi_auth_intent'] as const
const WTR_MAP_PIN_KEY = 'wtr-map-pin-color-view'
const OPEN_ER_CACHE_PREFIX = 'open-er-latest-usd'

function clearSessionOnboardingFlags(): void {
  try {
    sessionStorage.removeItem(FORCE_ONBOARDING_SESSION_KEY)
    sessionStorage.removeItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY)
    sessionStorage.removeItem(ONBOARDING_FROM_SIGNUP_KEY)
    sessionStorage.removeItem(AUTH_INTENT_KEY)
    for (const key of LEGACY_AUTH_INTENT_KEYS) {
      sessionStorage.removeItem(key)
    }
    sessionStorage.removeItem(WTR_MAP_PIN_KEY)
  } catch {
    /* private mode */
  }
}

function clearApiCacheEntries(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('hp-api-cache:')) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Remove all Expectifi data stored in this browser (account cancellation / sign-out purge). */
export function clearAllLocalUserData(): void {
  clearGuestProfileAndSession()
  clearSessionOnboardingFlags()
  clearApiCacheEntries()
  try {
    localStorage.removeItem(EXCLUDED_COUNTRIES_KEY)
    localStorage.removeItem(FAVORITE_CITIES_KEY)
    localStorage.removeItem(MANUAL_PROJECTIONS_CALLOUT_DISMISSED_KEY)
    localStorage.removeItem(OPEN_ER_CACHE_PREFIX)
    localStorage.removeItem(BALANCE_INPUT_MODE_KEY)
    localStorage.removeItem(BROKERAGE_BALANCE_MODE_KEY)
    clearStoredAppState()
    clearStoredFidelityImport()
  } catch {
    /* ignore */
  }
}
