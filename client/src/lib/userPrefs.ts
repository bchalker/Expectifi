import { isValidIsoDateString } from './ageFromDob'
import type { CalculatorInputs } from './computeResults'
import { clampClaimAge, normalizeClaimAge, type SsClaimAge } from './socialSecurity'

/** Guest welcome / plan profile (localStorage). */
const LEGACY_USER_PREFS_STORAGE_KEY = 'eggspectifi_user_prefs'
export const USER_PREFS_STORAGE_KEY = 'headwayplanner_user_prefs'
export const WELCOME_COMPLETED_STORAGE_KEY = 'headwayplanner_welcome_completed'

export type UserPrefs = {
  dob: string
  retirementAge: number
  monthlyGoal: number
  ssClaimingAge: number
}

const RETIRE_AGE_MIN = 50
const RETIRE_AGE_MAX = 80

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
  const prefs: UserPrefs = {
    dob,
    retirementAge: Math.round(retirementAge),
    monthlyGoal: Math.round(monthlyGoal),
    ssClaimingAge: clampClaimAge(Math.round(ssClaimingAge)),
  }
  return hasPlanningProfilePrefs(prefs) ? prefs : null
}

export function userPrefsToCalculatorPatch(p: UserPrefs): Partial<CalculatorInputs> {
  return {
    dateOfBirth: p.dob,
    targetRetirementAge: Math.round(p.retirementAge),
    monthlyIncomeGoal: Math.max(0, Math.round(p.monthlyGoal)),
    ssAge: clampClaimAge(p.ssClaimingAge),
  }
}

export function calculatorInputsToPlanningPrefs(inputs: CalculatorInputs): UserPrefs | null {
  const prefs: UserPrefs = {
    dob: inputs.dateOfBirth,
    retirementAge: inputs.targetRetirementAge,
    monthlyGoal: inputs.monthlyIncomeGoal,
    ssClaimingAge: clampClaimAge(inputs.ssAge),
  }
  return hasPlanningProfilePrefs(prefs) ? prefs : null
}

export function calculatorInputsToUserPrefs(inputs: CalculatorInputs): UserPrefs | null {
  const prefs = calculatorInputsToPlanningPrefs(inputs)
  return prefs && hasCompleteUserPrefs(prefs) ? prefs : null
}

/** Keep headwayplanner_user_prefs aligned with Configure planning fields. */
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

const EMPTY_PLANNING_DISPLAY: PlanningDisplayValues = {
  dateOfBirth: '',
  targetRetirementAge: 0,
  save: 0,
  growthGoal: 0,
  monthlyIncomeGoal: 0,
}

/** Values for planning UI — empty until onboarding or manual plan capture. */
export function planningDisplayFromInputs(inputs: CalculatorInputs): PlanningDisplayValues {
  if (!inputsHavePlanningProfileFields(inputs)) {
    return { ...EMPTY_PLANNING_DISPLAY }
  }
  return {
    dateOfBirth: inputs.dateOfBirth,
    targetRetirementAge: inputs.targetRetirementAge,
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
      raw = localStorage.getItem(LEGACY_USER_PREFS_STORAGE_KEY)
      if (raw) {
        localStorage.setItem(USER_PREFS_STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_USER_PREFS_STORAGE_KEY)
      }
    }
    if (!raw) return null
    return parseUserPrefs(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveLocalUserPrefs(prefs: UserPrefs): void {
  try {
    localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* quota / private mode */
  }
}

export function clearLocalUserPrefsStorage(): void {
  try {
    localStorage.removeItem(USER_PREFS_STORAGE_KEY)
    localStorage.removeItem(LEGACY_USER_PREFS_STORAGE_KEY)
    localStorage.removeItem(WELCOME_COMPLETED_STORAGE_KEY)
  } catch {
    /* quota / private mode */
  }
}

export function markWelcomeCompletedLocal(): void {
  try {
    localStorage.setItem(WELCOME_COMPLETED_STORAGE_KEY, '1')
  } catch {
    /* quota / private mode */
  }
}

export function isWelcomeCompletedLocal(): boolean {
  try {
    return localStorage.getItem(WELCOME_COMPLETED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function claimAgeFromPrefs(age: number): SsClaimAge {
  return normalizeClaimAge(age)
}
