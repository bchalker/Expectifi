import { clearStoredAppState } from './appStateStorage'
import { clearStoredPositionsImport } from './positionsImportStorage'
import { getPlanWriteTier } from './planStorage/writeContext'
import { tierIsAuthenticated } from './planStorage/resolveTier'
import { clearBalanceInputModeStorage } from './retirementBalanceMode'
import { BROKERAGE_BALANCE_MODE_KEY } from './brokerageBalanceMode'
import { clearLocalUserPrefsStorage } from './userPrefs'
import { clearStoredManualAccounts } from './manualAccountEntries'
import { clearUserProfileStorage } from './userProfileStorage'
import { clearGuestWhereToRetireStorage } from './whereToRetire/storage'
import { purgeGuestNonProfilePlanStorage } from './planStorage/purgeUnconsented'
import {
  EXPECTIFI_META_KEY,
  EXPECTIFI_PROFILE_KEY,
  MIGRATION_LEGACY_CLEANUP_KEYS,
} from './planStorage/keys'
import {
  clearSessionOnboardingAccounts,
  clearSessionOnboardingComplete,
} from './sessionFlags'
import { clearCalculatorPhaseSnap } from './calculatorPhaseSnap'
import { clearIncomeUiSnap } from './accountIncomeStorage'

const GUEST_TAB_ID_KEY = 'expectifi_guest_tab_id'
const GUEST_TABS_KEY = 'expectifi_guest_open_tabs'
const LEGACY_GUEST_TAB_ID_KEY = 'headwayplanner_guest_tab_id'
const LEGACY_GUEST_TABS_KEY = 'headwayplanner_guest_open_tabs'
/** Tabs not heartbeated within this window are treated as closed (crash-safe). */
const GUEST_TAB_STALE_MS = 180_000

type GuestTabRecord = {
  id: string
  ts: number
}

/** Ephemeral guest tabs: only track when signed in (guests use sessionStorage only). */
export function shouldTrackEphemeralGuestTabs(): boolean {
  return tierIsAuthenticated(getPlanWriteTier())
}

function readGuestTabs(): GuestTabRecord[] {
  try {
    let raw = localStorage.getItem(GUEST_TABS_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_GUEST_TABS_KEY)
      if (raw) {
        localStorage.setItem(GUEST_TABS_KEY, raw)
        localStorage.removeItem(LEGACY_GUEST_TABS_KEY)
      }
    }
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is GuestTabRecord =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as GuestTabRecord).id === 'string' &&
        typeof (entry as GuestTabRecord).ts === 'number',
    )
  } catch {
    return []
  }
}

function writeGuestTabs(tabs: GuestTabRecord[]): void {
  try {
    if (tabs.length === 0) localStorage.removeItem(GUEST_TABS_KEY)
    else localStorage.setItem(GUEST_TABS_KEY, JSON.stringify(tabs))
  } catch {
    /* quota / private mode */
  }
}

function pruneStaleGuestTabs(tabs: GuestTabRecord[], now = Date.now()): GuestTabRecord[] {
  return tabs.filter((tab) => now - tab.ts < GUEST_TAB_STALE_MS)
}

/** Remove guest financial session data. Preserves onboarding profile only. */
export function clearEphemeralGuestStorage(): void {
  try {
    clearStoredAppState()
    clearStoredManualAccounts()
    clearStoredPositionsImport()
    clearBalanceInputModeStorage()
    localStorage.removeItem(BROKERAGE_BALANCE_MODE_KEY)
    clearGuestWhereToRetireStorage()
  } catch {
    /* ignore */
  }
}

/** Full profile reset — clears saved onboarding profile and financial session data. */
export function clearGuestProfileAndSession(): void {
  clearUserProfileStorage()
  clearLocalUserPrefsStorage()
  clearEphemeralGuestStorage()
}

const OPEN_IMPORT_SESSION_KEY = 'expectifi_open_import'
const LEGACY_OPEN_IMPORT_SESSION_KEY = 'headwayplanner_open_import'
const POST_ONBOARDING_IMPORT_SESSION_KEY = 'expectifi_post_onboarding_import'

/** Clear post-onboarding add-accounts session flags (accounts added or flow finished). */
export function clearPostOnboardingImportSession(): void {
  try {
    sessionStorage.removeItem(OPEN_IMPORT_SESSION_KEY)
    sessionStorage.removeItem(LEGACY_OPEN_IMPORT_SESSION_KEY)
    sessionStorage.removeItem(POST_ONBOARDING_IMPORT_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Wipe guest plan/profile blobs from localStorage and session (no navigation side effects). */
export function clearGuestPersistedPlanStorage(): void {
  clearGuestProfileAndSession()
  purgeGuestNonProfilePlanStorage()
  try {
    localStorage.removeItem(EXPECTIFI_PROFILE_KEY)
    localStorage.removeItem(EXPECTIFI_META_KEY)
    for (const key of MIGRATION_LEGACY_CLEANUP_KEYS) {
      localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
  clearSessionOnboardingComplete()
  clearSessionOnboardingAccounts()
  clearCalculatorPhaseSnap()
  clearIncomeUiSnap()
  clearPostOnboardingImportSession()
}

/**
 * Guest abandoned onboarding or post-onboarding add accounts — wipe stored progress
 * so Get Started opens a fresh onboarding flow.
 */
export function clearGuestOnboardingCancelState(): void {
  clearGuestPersistedPlanStorage()
}

function touchGuestTab(tabId: string, now = Date.now()): GuestTabRecord[] {
  const tabs = pruneStaleGuestTabs(readGuestTabs(), now).filter((tab) => tab.id !== tabId)
  tabs.push({ id: tabId, ts: now })
  writeGuestTabs(tabs)
  return tabs
}

/**
 * Register an ephemeral guest tab. Clears stale guest data when no guest tabs remain open.
 * Call only for signed-out users after auth has loaded.
 */
export function initEphemeralGuestSession(): void {
  if (typeof window === 'undefined') return
  if (!shouldTrackEphemeralGuestTabs()) return

  let tabId = sessionStorage.getItem(GUEST_TAB_ID_KEY)
  if (!tabId) {
    tabId = sessionStorage.getItem(LEGACY_GUEST_TAB_ID_KEY)
    if (tabId) {
      sessionStorage.setItem(GUEST_TAB_ID_KEY, tabId)
      sessionStorage.removeItem(LEGACY_GUEST_TAB_ID_KEY)
    }
  }
  const isNewTab = !tabId
  if (!tabId) {
    tabId = crypto.randomUUID()
    sessionStorage.setItem(GUEST_TAB_ID_KEY, tabId)
  }

  const liveTabs = pruneStaleGuestTabs(readGuestTabs())
  if (isNewTab && liveTabs.length === 0) clearEphemeralGuestStorage()
  touchGuestTab(tabId)
}

export function heartbeatEphemeralGuestTab(): void {
  if (typeof window === 'undefined') return
  if (!shouldTrackEphemeralGuestTabs()) return
  const tabId = sessionStorage.getItem(GUEST_TAB_ID_KEY)
  if (!tabId) return
  touchGuestTab(tabId)
}

/** Call on tab close — clears guest local data when the last guest tab exits. */
export function teardownEphemeralGuestTab(): void {
  if (typeof window === 'undefined') return
  if (!shouldTrackEphemeralGuestTabs()) return

  const tabId = sessionStorage.getItem(GUEST_TAB_ID_KEY)
  if (!tabId) return

  const tabs = pruneStaleGuestTabs(readGuestTabs()).filter((tab) => tab.id !== tabId)
  writeGuestTabs(tabs)
  if (tabs.length === 0) clearEphemeralGuestStorage()
}
