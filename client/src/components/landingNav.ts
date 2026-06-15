import { APP_DASHBOARD_PATH, APP_PATHS, navigateApp } from '../lib/appPaths'
import {
  clearForceOnboardingSession,
  clearPostSignOutSession,
  guestHasCompletedOnboarding,
  markForceOnboardingSession,
} from '../lib/welcomeGate'

/** Guest calculator entry from marketing CTAs (Get started free). */
export function landingNavigateOnboarding(): void {
  clearPostSignOutSession()
  if (guestHasCompletedOnboarding()) {
    clearForceOnboardingSession()
  } else {
    markForceOnboardingSession()
  }
  navigateApp(guestHasCompletedOnboarding() ? APP_DASHBOARD_PATH : APP_PATHS.onboarding)
}
