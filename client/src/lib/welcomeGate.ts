import type { CalculatorInputs } from './computeResults'
import type { UserPrefs } from './userPrefs'
import {
  hasCompleteUserPrefs,
  hasPlanningProfilePrefs,
  inputsHavePlanningProfileFields,
  loadLocalUserPrefs,
} from './userPrefs'

export type WelcomeSkipContext = {
  onboardingDone?: boolean
  planPrefs?: UserPrefs | null
  inputs?: CalculatorInputs
}

/** True when welcome survey should not be shown. */
export function shouldSkipWelcome(ctx: WelcomeSkipContext): boolean {
  if (ctx.inputs && inputsHavePlanningProfileFields(ctx.inputs)) return true
  const local = loadLocalUserPrefs()
  if (hasPlanningProfilePrefs(local) || hasCompleteUserPrefs(local)) return true
  if (hasPlanningProfilePrefs(ctx.planPrefs ?? null) || hasCompleteUserPrefs(ctx.planPrefs ?? null)) {
    return true
  }
  if (ctx.onboardingDone) return true
  return false
}
