import { ageFromIsoDateString, isValidIsoDateString } from './ageFromDob'
import type { CalculatorInputs } from './computeResults'
import { canWritePlanLocalStorage, loadPlanProfile, profileHasOnboardingComplete, savePlanProfile } from './planStorage'
import { clampClaimAge, normalizeClaimAge, type SsClaimAge } from './socialSecurity'

/** Guest welcome / plan profile (localStorage). */
const LEGACY_USER_PREFS_STORAGE_KEYS = [
  'headwayplanner_user_prefs',
  'eggspectifi_user_prefs',
] as const
export const USER_PREFS_STORAGE_KEY = 'expectifi_user_prefs'
export const WELCOME_COMPLETED_STORAGE_KEY = 'expectifi_welcome_completed'
const LEGACY_WELCOME_COMPLETED_STORAGE_KEYS = ['headwayplanner_welcome_completed'] as const

export type UserPrefs = {
  dob: string
  retirementAge: number
  monthlyGoal: number
  ssClaimingAge: number
  residenceCountry?: string
}

export const RETIRE_AGE_MIN = 50
export const RETIRE_AGE_MAX = 80

export function retireAgeBoundsForDob(dateOfBirth: string): { min: number; max: number } {
  if (!isValidIsoDateString(dateOfBirth)) {
    return { min: RETIRE_AGE_MIN, max: RETIRE_AGE_MAX }
  }
  const at = ageFromIsoDateString(dateOfBirth)
  if (at < 18 || at > 100) {
    return { min: RETIRE_AGE_MIN, max: RETIRE_AGE_MAX }
  }
  return { min: Math.max(RETIRE_AGE_MIN, at + 1), max: RETIRE_AGE_MAX }
}

export function clampTargetRetirementAge(age: number, dateOfBirth: string): number {
  const n = Math.round(age)
  if (!Number.isFinite(n)) return RETIRE_AGE_MIN
  const { min, max } = retireAgeBoundsForDob(dateOfBirth)
  return Math.min(max, Math.max(min, n))
}

/** DOB, retirement age, and SS claiming — goal may be zero after configure. */
export function hasPlanningProfilePrefs(p: UserPrefs | null | undefined): boolean {
  if (!p) return false
  if (!isValidIsoDateString(p.dob)) return false
  const age = Math.round(p.retirementAge)
  if (!Number.isFinite(age) || age < RETIRE_AGE_MIN || age > RETIRE_AGE_MAX) return false
  const ss = clampClaimAge(p.ssClaimingAge)
  if (!Number.isFinite(ss)) return false
  return true
}

export function hasCompleteUserPrefs(p: UserPrefs | null | undefined): boolean {
  if (!p) return false
  if (!hasPlanningProfilePrefs(p)) return false
  const goal = Math.round(p.monthlyGoal)
  if (!Number.isFinite(goal) || goal <= 0) return false
  return true
}

export function parseUserPrefs(raw: unknown): UserPrefs | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const dob = typeof o.dob === 'string' ? o.dob.trim() : ''
  const retirementAge = typeof o.retirementAge === 'number' ? o.retirementAge : Number(o.retirementAge)
  const monthlyGoal = typeof o.monthlyGoal === 'number' ? o.monthlyGoal : Number(o.monthlyGoal)
  const ssClaimingAge =
    typeof o.ssClaimingAge === 'number' ? o.ssClaimingAge : Number(o.ssClaimingAge)
  const residenceCountry =
    typeof o.residenceCountry === 'string' ? o.residenceCountry.trim() : ''
  const prefs: UserPrefs = {
    dob,
    retirementAge: Math.round(retirementAge),
    monthlyGoal: Math.round(monthlyGoal),
    ssClaimingAge: clampClaimAge(Math.round(ssClaimingAge)),
    ...(residenceCountry ? { residenceCountry } : {}),
  }
  return hasPlanningProfilePrefs(prefs) ? prefs : null
}

export function userPrefsToCalculatorPatch(p: UserPrefs): Partial<CalculatorInputs> {
  return {
    dateOfBirth: p.dob,
    targetRetirementAge: Math.round(p.retirementAge),
    monthlyIncomeGoal: Math.max(0, Math.round(p.monthlyGoal)),
    ssAge: clampClaimAge(p.ssClaimingAge),
    residenceCountry: p.residenceCountry ?? '',
  }
}

export function calculatorInputsToPlanningPrefs(inputs: CalculatorInputs): UserPrefs | null {
  const prefs: UserPrefs = {
    dob: inputs.dateOfBirth,
    retirementAge: inputs.targetRetirementAge,
    monthlyGoal: inputs.monthlyIncomeGoal,
    ssClaimingAge: clampClaimAge(inputs.ssAge),
    ...(inputs.residenceCountry?.trim()
      ? { residenceCountry: inputs.residenceCountry.trim() }
      : {}),
  }
  return hasPlanningProfilePrefs(prefs) ? prefs : null
}

export function calculatorInputsToUserPrefs(inputs: CalculatorInputs): UserPrefs | null {
  const prefs = calculatorInputsToPlanningPrefs(inputs)
  return prefs && hasCompleteUserPrefs(prefs) ? prefs : null
}

/** Keep expectifi_user_prefs aligned with Configure planning fields. */
export function syncPlanningPrefsFromInputs(inputs: CalculatorInputs): void {
  const prefs = calculatorInputsToPlanningPrefs(inputs)
  if (prefs) saveLocalUserPrefs(prefs)
}

export function inputsHavePlanningProfileFields(inputs: CalculatorInputs): boolean {
  const prefs: UserPrefs = {
    dob: inputs.dateOfBirth,
    retirementAge: inputs.targetRetirementAge,
    monthlyGoal: inputs.monthlyIncomeGoal,
    ssClaimingAge: clampClaimAge(inputs.ssAge),
  }
  return hasPlanningProfilePrefs(prefs)
}

export type PlanningDisplayValues = {
  dateOfBirth: string
  targetRetirementAge: number
  save: number
  growthGoal: number
  monthlyIncomeGoal: number
}

/** Values for planning UI — always mirror live calculator inputs (avoids resetting fields mid-edit). */
export function planningDisplayFromInputs(inputs: CalculatorInputs): PlanningDisplayValues {
  return {
    dateOfBirth: inputs.dateOfBirth ?? '',
    targetRetirementAge: inputs.targetRetirementAge ?? 0,
    save: inputs.save,
    growthGoal: inputs.growthGoal,
    monthlyIncomeGoal: inputs.monthlyIncomeGoal,
  }
}

/** True when welcome survey fields are complete (includes a positive monthly goal). */
export function inputsHaveWelcomeFields(inputs: CalculatorInputs): boolean {
  return hasCompleteUserPrefs(calculatorInputsToUserPrefs(inputs))
}

export function loadLocalUserPrefs(): UserPrefs | null {
  try {
    let raw = localStorage.getItem(USER_PREFS_STORAGE_KEY)
    if (!raw) {
      for (const legacyKey of LEGACY_USER_PREFS_STORAGE_KEYS) {
        raw = localStorage.getItem(legacyKey)
        if (raw) {
          if (!canWritePlanLocalStorage()) {
            localStorage.setItem(USER_PREFS_STORAGE_KEY, raw)
            localStorage.removeItem(legacyKey)
          }
          break
        }
      }
    }
    if (!raw) return null
    return parseUserPrefs(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveLocalUserPrefs(prefs: UserPrefs): void {
  if (canWritePlanLocalStorage()) return
  try {
    localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalUserPrefsStorage(): void {
  try {
    localStorage.removeItem(USER_PREFS_STORAGE_KEY)
    for (const legacyKey of LEGACY_USER_PREFS_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey)
    }
    localStorage.removeItem(WELCOME_COMPLETED_STORAGE_KEY)
    for (const legacyKey of LEGACY_WELCOME_COMPLETED_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey)
    }
  } catch {
    /* quota / private mode */
  }
}

export function markWelcomeCompletedLocal(): void {
  if (canWritePlanLocalStorage()) {
    savePlanProfile({ ...loadPlanProfile(), version: 1, onboardingComplete: true })
    return
  }
  try {
    localStorage.setItem(WELCOME_COMPLETED_STORAGE_KEY, '1')
    for (const legacyKey of LEGACY_WELCOME_COMPLETED_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey)
    }
  } catch {
    /* quota / private mode */
  }
}

export function isWelcomeCompletedLocal(): boolean {
  if (canWritePlanLocalStorage() && profileHasOnboardingComplete(loadPlanProfile())) {
    return true
  }
  try {
    if (localStorage.getItem(WELCOME_COMPLETED_STORAGE_KEY) === '1') return true
    for (const legacyKey of LEGACY_WELCOME_COMPLETED_STORAGE_KEYS) {
      if (localStorage.getItem(legacyKey) === '1') {
        if (!canWritePlanLocalStorage()) {
          localStorage.setItem(WELCOME_COMPLETED_STORAGE_KEY, '1')
        }
        localStorage.removeItem(legacyKey)
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

export function claimAgeFromPrefs(age: number): SsClaimAge {
  return normalizeClaimAge(age)
}
