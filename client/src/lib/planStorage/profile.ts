import { parseStoredUserProfile, type StoredUserProfile } from '../userProfileStorage'
import { EXPECTIFI_PROFILE_KEY } from './keys'
import type { StoredPlanProfile } from './types'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'

export function loadPlanProfile(): StoredPlanProfile | null {
  const raw = readJsonFromLocalStorage<StoredPlanProfile>(EXPECTIFI_PROFILE_KEY)
  if (!raw) return null
  const base = parseStoredUserProfile(raw)
  if (!base) {
    if (raw.onboardingComplete === true) {
      return { version: 1, onboardingComplete: true }
    }
    return null
  }
  return {
    ...base,
    onboardingComplete:
      typeof raw.onboardingComplete === 'boolean' ? raw.onboardingComplete : undefined,
  }
}

export function savePlanProfile(patch: Partial<StoredPlanProfile>): StoredPlanProfile {
  const current = loadPlanProfile() ?? { version: 1 as const }
  const next: StoredPlanProfile = { ...current, ...patch, version: 1 }
  writeJsonToLocalStorage(EXPECTIFI_PROFILE_KEY, next)
  return next
}

export function profileHasOnboardingComplete(profile: StoredPlanProfile | null): boolean {
  return profile?.onboardingComplete === true
}

export function profileToStoredUserProfile(profile: StoredPlanProfile): StoredUserProfile {
  const { onboardingComplete: _omit, ...rest } = profile
  return rest
}
