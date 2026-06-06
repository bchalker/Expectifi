import { ageFromIsoDateString, isValidIsoDateString } from './ageFromDob'
import { isDobAgeInRange } from './dateOfBirthSelect'
import { clampClaimAgeInRange } from './socialSecurity'

export type SpouseSsClaimUiScenario =
  | 'dob-incomplete'
  | 'under-62'
  | 'claimable'
  | 'manual-benefit'

function birthYearFromIso(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob).trim())
  if (!m) return null
  const y = Number(m[1])
  return Number.isFinite(y) ? y : null
}

export function userClaimYear(userDob: string, userClaimAge: number): number | null {
  const userBirthYear = birthYearFromIso(userDob)
  if (userBirthYear == null) return null
  return userBirthYear + Math.round(userClaimAge)
}

/** Spouse's age in the year the primary filer reaches their selected claim age. */
export function spouseSpousalClaimMinAge(
  spouseDob: string,
  userDob: string,
  userClaimAge: number,
  claimAgeMin = 62,
  claimAgeMax = 70,
): number {
  const spouseBirthYear = birthYearFromIso(spouseDob)
  const claimYear = userClaimYear(userDob, userClaimAge)
  if (spouseBirthYear == null || claimYear == null) {
    return clampClaimAgeInRange(userClaimAge, claimAgeMin, claimAgeMax)
  }
  const spouseMinAge = claimYear - spouseBirthYear
  return clampClaimAgeInRange(spouseMinAge, claimAgeMin, claimAgeMax)
}

export function isSpouseDobComplete(spouseDob: string): boolean {
  return Boolean(
    spouseDob &&
      isValidIsoDateString(spouseDob) &&
      isDobAgeInRange(spouseDob),
  )
}

export function spouseCurrentAge(spouseDob: string): number | null {
  if (!isSpouseDobComplete(spouseDob)) return null
  return ageFromIsoDateString(spouseDob)
}

function dateAtAge(dob: string, age: number): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob).trim())
  if (!m) return new Date()
  const y = Number(m[1]) + Math.round(age)
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return new Date(y, mo, d)
}

/** Spouse age on the date the primary filer reaches their selected claim age. */
export function spouseAgeAtUserClaim(
  spouseDob: string,
  userDob: string,
  userClaimAge: number,
): number | null {
  if (!isSpouseDobComplete(spouseDob) || !isValidIsoDateString(userDob)) {
    return null
  }
  return ageFromIsoDateString(spouseDob, dateAtAge(userDob, userClaimAge))
}

export function spouseSsClaimUiScenario({
  spouseDob,
  userDob,
  userClaimAge,
  claimAgeMin = 62,
  claimAgeMax = 70,
}: {
  spouseDob: string
  userDob: string
  userClaimAge: number
  claimAgeMin?: number
  claimAgeMax?: number
}): SpouseSsClaimUiScenario {
  if (!isSpouseDobComplete(spouseDob)) return 'dob-incomplete'

  const spouseAgeNow = ageFromIsoDateString(spouseDob)
  const spouseAgeWhenUserClaims = spouseAgeAtUserClaim(
    spouseDob,
    userDob,
    userClaimAge,
  )
  const spouseAgeForEligibility = spouseAgeWhenUserClaims ?? spouseAgeNow

  if (spouseAgeForEligibility < claimAgeMin) return 'under-62'

  if (spouseAgeNow > claimAgeMax) return 'manual-benefit'
  if (
    spouseAgeWhenUserClaims != null &&
    spouseAgeWhenUserClaims > claimAgeMax
  ) {
    return 'manual-benefit'
  }

  const userAge =
    userDob && isValidIsoDateString(userDob) ? ageFromIsoDateString(userDob) : null
  if (userAge != null && spouseAgeNow > userAge && spouseAgeNow > userClaimAge) {
    return 'manual-benefit'
  }

  return 'claimable'
}
