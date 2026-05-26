/**
 * Tier-1 session-only flags (sessionStorage).
 * Never written to localStorage — cleared when the tab/session ends.
 */

export const SESSION_ONBOARDING_COMPLETE_KEY = 'expectifi/session/onboarding-complete'
export const SESSION_ONBOARDING_ACCOUNTS_KEY = 'expectifi/session/onboarding-accounts'
export const SESSION_SAVE_PLAN_DISMISSED_KEY = 'expectifi/session/save-plan-dismissed'
export const SESSION_HAS_CSV_HOLDINGS_KEY = 'expectifi/session/has-csv-holdings'

/** Fired when tier-1 onboarding finishes in this tab (save-plan dismiss resets). */
export const ONBOARDING_SESSION_COMPLETE_EVENT = 'expectifi-onboarding-session-complete'
/** Fired when session-only CSV holdings are saved/cleared. */
export const CSV_SESSION_HOLDINGS_EVENT = 'expectifi-csv-session-holdings'

export function isSessionOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_COMPLETE_KEY) === '1'
  } catch {
    return false
  }
}

export function clearSessionSavePlanDismissed(): void {
  setSessionSavePlanDismissed(false)
}

export function setSessionOnboardingComplete(complete = true): void {
  if (typeof window === 'undefined') return
  try {
    if (complete) {
      sessionStorage.setItem(SESSION_ONBOARDING_COMPLETE_KEY, '1')
      sessionStorage.removeItem(SESSION_SAVE_PLAN_DISMISSED_KEY)
      window.dispatchEvent(new CustomEvent(ONBOARDING_SESSION_COMPLETE_EVENT))
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

export function isSessionSavePlanDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_SAVE_PLAN_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function hasSessionCsvHoldings(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_HAS_CSV_HOLDINGS_KEY) === '1'
  } catch {
    return false
  }
}

export function setSessionHasCsvHoldings(hasHoldings = true): void {
  if (typeof window === 'undefined') return
  try {
    if (hasHoldings) {
      sessionStorage.setItem(SESSION_HAS_CSV_HOLDINGS_KEY, '1')
    } else {
      sessionStorage.removeItem(SESSION_HAS_CSV_HOLDINGS_KEY)
    }
    window.dispatchEvent(new CustomEvent(CSV_SESSION_HOLDINGS_EVENT))
  } catch {
    /* private mode */
  }
}

export function loadSessionOnboardingAccounts(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_ACCOUNTS_KEY)
  } catch {
    return null
  }
}

export function setSessionOnboardingAccounts(entriesJson: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_ONBOARDING_ACCOUNTS_KEY, entriesJson)
  } catch {
    /* private mode */
  }
}

export function clearSessionOnboardingAccounts(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_ONBOARDING_ACCOUNTS_KEY)
  } catch {
    /* private mode */
  }
}

/**
 * Tier 1 without browser save: reset ephemeral onboarding on each document boot.
 * sessionStorage survives hard refresh; bootPlanHydration does not re-run after
 * in-session onboarding, so clearing here only affects reload/new navigation.
 * Save-plan dismiss is left intact for the tab session.
 */
export function resetAnonymousEphemeralSessionOnBoot(): void {
  clearSessionOnboardingComplete()
  clearSessionOnboardingAccounts()
}

export function setSessionSavePlanDismissed(dismissed = true): void {
  if (typeof window === 'undefined') return
  try {
    if (dismissed) {
      sessionStorage.setItem(SESSION_SAVE_PLAN_DISMISSED_KEY, '1')
    } else {
      sessionStorage.removeItem(SESSION_SAVE_PLAN_DISMISSED_KEY)
    }
  } catch {
    /* private mode */
  }
}
