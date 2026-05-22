import gettingThereData from '../data/getting-there.json'
import { getQualityOfLifeData } from './qualityOfLife'

export type SafetyFilter = 'any' | 'reasonably-safe' | 'very-safe'

export type HealthcareFilter = 'any' | 'good-care' | 'excellent'

export type MaxFlightTimeFilter = 'any' | 'under-5' | 'under-10' | 'under-15'

export type VisaFreeDaysFilter = 'any' | '30-plus' | '60-plus' | '90-plus' | '180-plus'

export type MinRetirementScoreFilter = 'any' | 'good-55' | 'strong-70' | 'excellent-85'

type GettingThereCountry = {
  direct_from_us: boolean
  flight_time_hours: { east_coast: number; west_coast: number }
  visa_free_days: number
}

const gettingThereCountries = (
  gettingThereData as { countries: Record<string, GettingThereCountry> }
).countries

export function getGettingThereCountry(country: string): GettingThereCountry | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return gettingThereCountries[trimmed] ?? null
}

export function eastCoastFlightHours(country: string): number | null {
  return getGettingThereCountry(country)?.flight_time_hours.east_coast ?? null
}

export function passesSafetyFilter(country: string, filter: SafetyFilter): boolean {
  if (filter === 'any') return true
  const qol = getQualityOfLifeData(country)
  if (!qol) return false
  if (filter === 'reasonably-safe') return qol.safety_index >= 55
  return qol.safety_index >= 75
}

export function passesHealthcareFilter(country: string, filter: HealthcareFilter): boolean {
  if (filter === 'any') return true
  const qol = getQualityOfLifeData(country)
  if (!qol) return false
  if (filter === 'good-care') return qol.healthcare_index >= 60
  return qol.healthcare_index >= 75
}

export function passesGoodAirFilter(country: string, goodAirOnly: boolean): boolean {
  if (!goodAirOnly) return true
  const qol = getQualityOfLifeData(country)
  if (!qol) return false
  return qol.pollution_index < 50
}

export function passesMaxFlightTimeFilter(
  country: string,
  filter: MaxFlightTimeFilter,
): boolean {
  if (filter === 'any') return true
  const hours = eastCoastFlightHours(country)
  if (hours == null) return false
  const maxHours =
    filter === 'under-5' ? 5 : filter === 'under-10' ? 10 : 15
  return hours <= maxHours
}

export function passesDirectFlightsFilter(
  country: string,
  directFromUsOnly: boolean,
): boolean {
  if (!directFromUsOnly) return true
  const entry = getGettingThereCountry(country)
  if (!entry) return false
  return entry.direct_from_us === true
}

export function passesVisaFreeDaysFilter(
  country: string,
  filter: VisaFreeDaysFilter,
): boolean {
  if (filter === 'any') return true
  const entry = getGettingThereCountry(country)
  if (!entry) return false
  const minDays =
    filter === '30-plus'
      ? 30
      : filter === '60-plus'
        ? 60
        : filter === '90-plus'
          ? 90
          : 180
  return entry.visa_free_days >= minDays
}

export function minRetirementScoreThreshold(
  filter: MinRetirementScoreFilter,
): number | null {
  switch (filter) {
    case 'any':
      return null
    case 'good-55':
      return 55
    case 'strong-70':
      return 70
    case 'excellent-85':
      return 85
  }
}

export function passesMinRetirementScoreFilter(
  retirementScore: number,
  filter: MinRetirementScoreFilter,
): boolean {
  const min = minRetirementScoreThreshold(filter)
  if (min == null) return true
  return retirementScore >= min
}
