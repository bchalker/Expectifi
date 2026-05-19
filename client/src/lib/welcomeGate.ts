import type { CalculatorInputs } from './computeResults'
import type { UserPrefs } from './userPrefs'
import {
  hasCompleteUserPrefs,
  isWelcomeCompletedLocal,
  loadLocalUserPrefs,
} from './userPrefs'

export type WelcomeSkipContext = {
  onboardingDone?: boolean
  planPrefs?: UserPrefs | null
  inputs?: CalculatorInputs
}

/** True when welcome survey should not be shown. */
export function shouldSkipWelcome(ctx: WelcomeSkipContext): boolean {
  if (ctx.onboardingDone) return true
  if (isWelcomeCompletedLocal()) return true
  const local = loadLocalUserPrefs()
  if (hasCompleteUserPrefs(local)) return true
  if (hasCompleteUserPrefs(ctx.planPrefs ?? null)) return true
  return false
}
