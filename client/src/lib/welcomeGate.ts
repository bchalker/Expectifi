import type { CalculatorInputs } from './computeResults'
import { hasPortfolioBalanceInputs } from './computeResults'
import { loadStoredFidelityImport } from './fidelityStorage'
import { storedManualAccountsHaveBalances } from './manualAccountEntries'
import type { UserPrefs } from './userPrefs'
import { isWelcomeCompletedLocal } from './userPrefs'

export const FORCE_ONBOARDING_SESSION_KEY = 'expectifi_force_onboarding'
const LEGACY_FORCE_ONBOARDING_SESSION_KEY = 'headwayplanner_force_onboarding'

export type WelcomeSkipContext = {
  onboardingDone?: boolean
  planPrefs?: UserPrefs | null
  inputs?: CalculatorInputs
}

function fidelityImportHasBalances(): boolean {
  const balances = loadStoredFidelityImport()?.balances
  if (!balances) return false
  return (
    balances.base401k +
      balances.baseSE401k +
      balances.baseRoth +
      balances.baseHsa +
      balances.brkBal >
    0
  )
}

/** True when the user has entered account balances (manual onboarding, import, or calculator inputs). */
export function hasStoredAccountData(inputs?: CalculatorInputs): boolean {
  if (isWelcomeCompletedLocal() && storedManualAccountsHaveBalances()) return true
  if (fidelityImportHasBalances() && isWelcomeCompletedLocal()) return true
  if (!inputs) return false
  const retBal =
    inputs.base401k + inputs.baseSE401k + inputs.baseTradIRA + inputs.baseRoth + inputs.baseHsa
  return hasPortfolioBalanceInputs(retBal, inputs.brkBal, [])
}

/**
 * True when the user finished onboarding (Continue to Dashboard) with account data saved.
 * Account balances are always required — a profile/onboarding flag alone must not skip welcome.
 */
export function isOnboardingComplete(ctx: WelcomeSkipContext): boolean {
  if (!hasStoredAccountData(ctx.inputs)) return false
  if (isWelcomeCompletedLocal()) return true
  if (ctx.onboardingDone) return true
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
