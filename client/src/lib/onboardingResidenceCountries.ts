import { ONBOARDING_REGION_OPTIONS } from './onboardingRegions'

/** Launch countries for welcome/profile residence select. */
export const ONBOARDING_RESIDENCE_COUNTRIES: readonly string[] = ONBOARDING_REGION_OPTIONS.map(
  (r) => r.country,
)

export function isOnboardingResidenceCountry(value: string): boolean {
  return ONBOARDING_RESIDENCE_COUNTRIES.includes(value)
}
