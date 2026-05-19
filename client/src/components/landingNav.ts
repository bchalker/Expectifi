import { APP_PATHS, navigateApp } from '../lib/appPaths'
import { markForceOnboardingSession } from '../lib/welcomeGate'

/** Guest calculator entry from marketing CTAs (Get started free). */
export function landingNavigateOnboarding(): void {
  markForceOnboardingSession()
  navigateApp(APP_PATHS.onboarding)
}
