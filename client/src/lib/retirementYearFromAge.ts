import { ageFromIsoDateString, isValidIsoDateString } from './ageFromDob'

/** Calendar year when the user reaches the selected retirement age. */
export function retirementYearFromAge(
  dobIso: string,
  retireAge: number,
  asOf: Date = new Date(),
): number | null {
  if (!isValidIsoDateString(dobIso) || !Number.isFinite(retireAge)) return null
  const ageToday = ageFromIsoDateString(dobIso)
  return asOf.getFullYear() + Math.round(retireAge - ageToday)
}
