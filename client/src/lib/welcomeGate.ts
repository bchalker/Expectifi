import { loadPlanAccounts, planAccountsHaveBalances } from './planStorage/accounts'
import { hasSavePlanBeenAccepted } from './planStorage/meta'
import { loadPlanProfile, profileHasOnboardingComplete } from './planStorage/profile'
import { isSessionOnboardingComplete } from './sessionFlags'
import type { UserPrefs } from './userPrefs'
import { isWelcomeCompletedLocal } from './userPrefs'

export const FORCE_ONBOARDING_SESSION_KEY = 'expectifi_force_onboarding'
const LEGACY_FORCE_ONBOARDING_SESSION_KEY = 'headwayplanner_force_onboarding'
/** Set after register / Google checkout so welcome starts at region, not a stale guest profile step. */
export const ONBOARDING_FROM_SIGNUP_KEY = 'expectifi_onboarding_from_signup'
/** Set after sign-out so AppRoot shows the marketing landing instead of the guest calculator. */
export const POST_SIGNOUT_SESSION_KEY = 'expectifi_post_signout'

export type WelcomeSkipContext = {
  /** From plan hydration (localStorage or sessionStorage for tier 1). */
  onboardingComplete?: boolean
  /** Server flag for signed-in users. */
  onboardingDone?: boolean
  planPrefs?: UserPrefs | null
}

/** True when onboarding should be treated as finished for this session. */
export function isOnboardingComplete(ctx: WelcomeSkipContext): boolean {
  if (ctx.onboardingComplete === true) return true
  if (ctx.onboardingDone === true) return true
  return false
}

/** Show welcome overlay unless onboarding is fully complete. */
export function shouldShowWelcomeOverlay(ctx: WelcomeSkipContext): boolean {
  if (isOnboardingComplete(ctx)) return false
  if (!ctx.onboardingDone && guestHasCompletedOnboarding()) return false
  return true
}

/** Guest local/session signals that onboarding finished (marketing CTA should open dashboard). */
export function guestHasCompletedOnboarding(): boolean {
  if (profileHasOnboardingComplete(loadPlanProfile())) return true
  if (isWelcomeCompletedLocal()) return true
  if (isSessionOnboardingComplete()) return true
  if (hasSavePlanBeenAccepted() && planAccountsHaveBalances(loadPlanAccounts())) return true
  return false
}

export function markForceOnboardingSession(): void {
  try {
    sessionStorage.setItem(FORCE_ONBOARDING_SESSION_KEY, '1')
    sessionStorage.removeItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY)
  } catch {
    /* private mode */
  }
}

export function markOnboardingFromSignup(): void {
  markForceOnboardingSession()
  try {
    sessionStorage.setItem(ONBOARDING_FROM_SIGNUP_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function peekOnboardingFromSignup(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_FROM_SIGNUP_KEY) === '1'
  } catch {
    return false
  }
}

export function consumeOnboardingFromSignup(): boolean {
  try {
    const v = sessionStorage.getItem(ONBOARDING_FROM_SIGNUP_KEY) === '1'
    if (v) sessionStorage.removeItem(ONBOARDING_FROM_SIGNUP_KEY)
    return v
  } catch {
    return false
  }
}

export function clearForceOnboardingSession(): void {
  try {
    sessionStorage.removeItem(FORCE_ONBOARDING_SESSION_KEY)
    sessionStorage.removeItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY)
  } catch {
    /* private mode */
  }
}

export function markPostSignOutSession(): void {
  try {
    sessionStorage.setItem(POST_SIGNOUT_SESSION_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function peekPostSignOutSession(): boolean {
  try {
    return sessionStorage.getItem(POST_SIGNOUT_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function consumePostSignOutSession(): boolean {
  try {
    const v = sessionStorage.getItem(POST_SIGNOUT_SESSION_KEY) === '1'
    if (v) sessionStorage.removeItem(POST_SIGNOUT_SESSION_KEY)
    return v
  } catch {
    return false
  }
}

export function clearPostSignOutSession(): void {
  try {
    sessionStorage.removeItem(POST_SIGNOUT_SESSION_KEY)
  } catch {
    /* private mode */
  }
}

export function peekForceOnboardingSession(): boolean {
  try {
    if (sessionStorage.getItem(FORCE_ONBOARDING_SESSION_KEY) === '1') return true
    if (sessionStorage.getItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY) === '1') {
      sessionStorage.setItem(FORCE_ONBOARDING_SESSION_KEY, '1')
      sessionStorage.removeItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY)
      return true
    }
    return false
  } catch {
    return false
  }
}

export function consumeForceOnboardingSession(): boolean {
  try {
    if (sessionStorage.getItem(FORCE_ONBOARDING_SESSION_KEY) === '1') {
      sessionStorage.removeItem(FORCE_ONBOARDING_SESSION_KEY)
      return true
    }
    if (sessionStorage.getItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY) === '1') {
      sessionStorage.removeItem(LEGACY_FORCE_ONBOARDING_SESSION_KEY)
      return true
    }
    return false
  } catch {
    return false
  }
}

/** @deprecated Use isOnboardingComplete */
export function shouldSkipWelcome(ctx: WelcomeSkipContext): boolean {
  return isOnboardingComplete(ctx)
}
