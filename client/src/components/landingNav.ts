import { APP_PATHS, navigateApp } from '../lib/appPaths'
import {
  clearForceOnboardingSession,
  guestHasCompletedOnboarding,
  markForceOnboardingSession,
} from '../lib/welcomeGate'

/** Guest calculator entry from marketing CTAs (Get started free). */
export function landingNavigateOnboarding(): void {
  if (guestHasCompletedOnboarding()) {
    clearForceOnboardingSession()
  } else {
    markForceOnboardingSession()
  }
  navigateApp(APP_PATHS.onboarding)
}
