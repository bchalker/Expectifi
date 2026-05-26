import { parseSnapshot } from '../appSnapshot'
import { isWelcomeCompletedLocal } from '../userPrefs'
import { parseStoredUserProfile } from '../userProfileStorage'
import type { StoredManualAccounts } from '../manualAccountEntries'
import {
  ALL_LEGACY_PLAN_STORAGE_KEYS,
  EXPECTIFI_META_KEY,
  LEGACY_APP_STATE_KEY,
  LEGACY_MANUAL_ACCOUNTS_KEY,
  LEGACY_USER_PROFILE_KEY,
  LEGACY_USER_PROFILE_KEYS,
  LEGACY_WELCOME_COMPLETED_KEY,
  LEGACY_WELCOME_COMPLETED_KEYS,
  MIGRATION_LEGACY_CLEANUP_KEYS,
} from './keys'
import { savePlanAccounts } from './accounts'
import { defaultMeta, loadMeta, saveMeta } from './meta'
import { loadPlanProfile, savePlanProfile } from './profile'
import { savePlanSession } from './session'
import { runWithMigrationPlanWrites } from './writeContext'
import type { StoredPlanProfile } from './types'
import { readJsonFromLocalStorage, removeFromLocalStorage } from './storageUtils'

function legacyWelcomeCompleted(): boolean {
  if (isWelcomeCompletedLocal()) return true
  try {
    if (localStorage.getItem(LEGACY_WELCOME_COMPLETED_KEY) === '1') return true
    for (const key of LEGACY_WELCOME_COMPLETED_KEYS) {
      if (localStorage.getItem(key) === '1') return true
    }
  } catch {
    /* ignore */
  }
  return false
}

function readLegacyProfile(): StoredPlanProfile | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(LEGACY_USER_PROFILE_KEY)
    if (!raw) {
      for (const legacy of LEGACY_USER_PROFILE_KEYS) {
        raw = localStorage.getItem(legacy)
        if (raw) break
      }
    }
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredPlanProfile & { onboardingComplete?: boolean }
    const base = parseStoredUserProfile(parsed)
    if (!base) return null
    return {
      ...base,
      onboardingComplete: legacyWelcomeCompleted() || parsed.onboardingComplete === true,
    }
  } catch {
    return null
  }
}

function readLegacyAccounts(): StoredManualAccounts | null {
  const parsed = readJsonFromLocalStorage<StoredManualAccounts>(LEGACY_MANUAL_ACCOUNTS_KEY)
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return null
  return parsed
}

function readLegacySession(): ReturnType<typeof parseSnapshot> {
  const raw = readJsonFromLocalStorage<unknown>(LEGACY_APP_STATE_KEY)
  if (!raw) return null
  return parseSnapshot(raw)
}

function hasLegacyDataToMigrate(): boolean {
  const legacyProfile = readLegacyProfile()
  const legacyAccounts = readLegacyAccounts()
  const legacySession = readLegacySession()
  return legacyProfile != null || legacyAccounts != null || legacySession != null
}

/** True when any pre-Phase-A plan key remains in localStorage. */
export function hasLegacyPlanStorageKeys(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return ALL_LEGACY_PLAN_STORAGE_KEYS.some((key) => localStorage.getItem(key) != null)
  } catch {
    return false
  }
}

function expectifiPlanWritesSucceeded(): boolean {
  return readJsonFromLocalStorage(EXPECTIFI_META_KEY) != null
}

/** Delete legacy keys only after expectifi/* migration writes succeeded. */
function clearLegacyKeysAfterSuccessfulMigration(): void {
  if (!expectifiPlanWritesSucceeded()) return
  for (const key of MIGRATION_LEGACY_CLEANUP_KEYS) {
    removeFromLocalStorage(key)
  }
}

/**
 * One-time import from pre-Phase-A keys into expectifi/*.
 * Writes localStorage only when legacy data exists (tier → browser_saved).
 * First-time anonymous visitors: no writes; tier is resolved in memory via resolveUserTier().
 */
export function migrateLegacyPlanStorageIfNeeded(): boolean {
  if (typeof window === 'undefined') return false
  if (loadMeta()) return false
  if (!hasLegacyDataToMigrate()) return false

  const legacyProfile = readLegacyProfile()
  const legacyAccounts = readLegacyAccounts()
  const legacySession = readLegacySession()
  const hadWelcome = legacyWelcomeCompleted()

  return runWithMigrationPlanWrites(() => {
    const meta = defaultMeta('browser_saved')
    meta.prompts.savePlanAcceptedAt = new Date().toISOString()
    saveMeta(meta)

    const existingProfile = loadPlanProfile()
    if (!existingProfile && legacyProfile) {
      savePlanProfile(legacyProfile)
    } else if (legacyProfile) {
      savePlanProfile({
        ...legacyProfile,
        onboardingComplete:
          legacyProfile.onboardingComplete === true ||
          hadWelcome ||
          existingProfile?.onboardingComplete,
      })
    } else if (hadWelcome) {
      savePlanProfile({ version: 1, onboardingComplete: true })
    }

    if (legacyAccounts) savePlanAccounts(legacyAccounts)
    if (legacySession) savePlanSession(legacySession)

    clearLegacyKeysAfterSuccessfulMigration()
    return true
  })
}
