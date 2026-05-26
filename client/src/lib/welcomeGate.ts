import type { UserPrefs } from './userPrefs'

export const FORCE_ONBOARDING_SESSION_KEY = 'expectifi_force_onboarding'
const LEGACY_FORCE_ONBOARDING_SESSION_KEY = 'headwayplanner_force_onboarding'
/** Set after register / Google checkout so welcome starts at region, not a stale guest profile step. */
export const ONBOARDING_FROM_SIGNUP_KEY = 'expectifi_onboarding_from_signup'

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
  return true
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
