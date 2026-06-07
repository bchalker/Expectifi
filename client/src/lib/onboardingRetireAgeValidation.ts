import { ageFromIsoDateString, isValidIsoDateString } from './ageFromDob'

export type OnboardingRetireAgePastValidation = {
  retirementYear: number | null
  minValidAge: number | null
  isInvalid: boolean
}

export function birthYearFromDobIso(dobIso: string): number | null {
  if (!isValidIsoDateString(dobIso)) return null
  const birthYear = Number.parseInt(dobIso.slice(0, 4), 10)
  return Number.isFinite(birthYear) ? birthYear : null
}

/** Step 1 — retirement year must be after the current calendar year. */
export function onboardingRetireAgePastValidation(
  dobIso: string,
  retireAge: number,
  currentYear: number = new Date().getFullYear(),
): OnboardingRetireAgePastValidation {
  const birthYear = birthYearFromDobIso(dobIso)
  if (
    birthYear == null ||
    !Number.isFinite(retireAge) ||
    retireAge <= 0
  ) {
    return { retirementYear: null, minValidAge: null, isInvalid: false }
  }

  const roundedAge = Math.round(retireAge)
  const retirementYear = birthYear + roundedAge
  const minValidAge = currentYear - birthYear + 1
  const isInvalid = retirementYear <= currentYear

  return { retirementYear, minValidAge, isInvalid }
}

/** Earliest slider default — user's current age, or next age if that year has passed. */
export function onboardingRetireAgeStartForDob(
  dobIso: string,
  currentYear: number = new Date().getFullYear(),
): number | null {
  const birthYear = birthYearFromDobIso(dobIso)
  if (birthYear == null) return null

  const currentAge = ageFromIsoDateString(dobIso)
  const minValidAge = currentYear - birthYear + 1
  return Math.max(currentAge, minValidAge)
}
