/**
 * Tier-1 session-only flags (sessionStorage).
 * Never written to localStorage — cleared when the tab/session ends.
 */

export const SESSION_ONBOARDING_COMPLETE_KEY = 'expectifi/session/onboarding-complete'

export function isSessionOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_COMPLETE_KEY) === '1'
  } catch {
    return false
  }
}

export function setSessionOnboardingComplete(complete = true): void {
  if (typeof window === 'undefined') return
  try {
    if (complete) {
      sessionStorage.setItem(SESSION_ONBOARDING_COMPLETE_KEY, '1')
    } else {
      sessionStorage.removeItem(SESSION_ONBOARDING_COMPLETE_KEY)
    }
  } catch {
    /* private mode */
  }
}

export function clearSessionOnboardingComplete(): void {
  setSessionOnboardingComplete(false)
}
