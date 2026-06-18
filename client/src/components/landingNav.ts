import { APP_DASHBOARD_PATH, APP_PATHS, navigateApp, normalizeAppPath } from '../lib/appPaths'
import {
  clearForceOnboardingSession,
  clearPostSignOutSession,
  guestHasCompletedOnboarding,
  markForceOnboardingSession,
} from '../lib/welcomeGate'

/** Guest calculator entry from marketing CTAs (Get started free). */
export function enterAppFromLanding(): void {
  if (guestHasCompletedOnboarding()) {
    clearForceOnboardingSession()
  } else {
    markForceOnboardingSession()
  }
  const target = guestHasCompletedOnboarding()
    ? APP_DASHBOARD_PATH
    : APP_PATHS.onboarding
  if (normalizeAppPath(window.location.pathname) !== normalizeAppPath(target)) {
    navigateApp(target)
  }
}

/** @deprecated Use releaseLandingGate + enterAppFromLanding from AppRoot. */
export function landingNavigateOnboarding(): void {
  clearPostSignOutSession()
  enterAppFromLanding()
}
