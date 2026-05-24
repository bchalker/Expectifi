import { whereToLookCountrySet } from './whereToRetire/whereToLookCountries'

const US = 'United States'
const EUROPE = whereToLookCountrySet('europe')!

/** US plus European countries for welcome “where do you live” select. */
export const ONBOARDING_RESIDENCE_COUNTRIES: readonly string[] = [
  US,
  ...[...EUROPE].sort((a, b) => a.localeCompare(b)),
]

export function isOnboardingResidenceCountry(value: string): boolean {
  return ONBOARDING_RESIDENCE_COUNTRIES.includes(value)
}
