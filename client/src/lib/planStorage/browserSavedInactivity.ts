import { clearGuestPersistedPlanStorage } from '../guestEphemeralStorage'
import { EXPECTIFI_META_KEY } from './keys'
import { hasSavePlanBeenAccepted, loadMeta, defaultMeta } from './meta'
import { loadPlanProfile, profileHasOnboardingComplete } from './profile'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'
import type { AuthTierInput, ExpectifiMeta } from './types'
import { getPlanWriteTier } from './writeContext'
import { tierIsAuthenticated } from './resolveTier'

/** Inactivity window for browser-saved guest plans — not a session TTL or cache bust. */
export const BROWSER_SAVED_INACTIVITY_MS = 30 * 24 * 60 * 60 * 1000

function guestHasPersistedPlanArtifacts(): boolean {
  const profile = loadPlanProfile()
  if (profileHasOnboardingComplete(profile)) return true
  if (hasSavePlanBeenAccepted()) return true
  return profile != null
}

/** ISO timestamp of last meaningful guest plan edit (stored in expectifi/meta-v1). */
export function loadBrowserSavedLastActiveAt(): string | null {
  const meta = readJsonFromLocalStorage<ExpectifiMeta>(EXPECTIFI_META_KEY)
  const lastActiveAt = meta?.lastActiveAt
  return typeof lastActiveAt === 'string' && lastActiveAt.length > 0
    ? lastActiveAt
    : null
}

/** Bump inactivity clock after a meaningful browser-saved plan change (guests only). */
export function touchBrowserSavedLastActiveAt(iso = new Date().toISOString()): void {
  if (tierIsAuthenticated(getPlanWriteTier())) return
  if (!guestHasPersistedPlanArtifacts()) return
  if (typeof window === 'undefined') return

  const current = loadMeta() ?? defaultMeta('anonymous')
  writeJsonToLocalStorage(EXPECTIFI_META_KEY, {
    ...current,
    lastActiveAt: iso,
  })
}

export function clearBrowserSavedLastActiveAt(): void {
  const current = loadMeta()
  if (!current?.lastActiveAt) return
  const { lastActiveAt: _omit, ...rest } = current
  try {
    if (Object.keys(rest.prompts ?? {}).length === 0 && rest.tier === 'anonymous' && !rest.visitCount) {
      localStorage.removeItem(EXPECTIFI_META_KEY)
      return
    }
    writeJsonToLocalStorage(EXPECTIFI_META_KEY, rest)
  } catch {
    /* ignore */
  }
}

/**
 * On boot: if a guest browser-saved plan has been idle for 30+ days, purge local
 * plan data and return true so hydration starts fresh. Signed-in users are unaffected.
 */
export function expireGuestBrowserSavedPlanIfInactive(auth: AuthTierInput): boolean {
  if (auth?.subscriptionStatus != null) return false
  if (!guestHasPersistedPlanArtifacts()) return false

  const lastActiveAt = loadBrowserSavedLastActiveAt()
  if (!lastActiveAt) {
    touchBrowserSavedLastActiveAt()
    return false
  }

  const inactiveMs = Date.now() - Date.parse(lastActiveAt)
  if (!Number.isFinite(inactiveMs) || inactiveMs <= BROWSER_SAVED_INACTIVITY_MS) {
    return false
  }

  clearGuestPersistedPlanStorage()
  return true
}
