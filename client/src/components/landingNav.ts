import { APP_PATHS, navigateApp } from '../lib/appPaths'

/** Guest calculator entry from marketing CTAs (Get started free). */
export function landingNavigateOnboarding(): void {
  navigateApp(APP_PATHS.onboarding)
}
