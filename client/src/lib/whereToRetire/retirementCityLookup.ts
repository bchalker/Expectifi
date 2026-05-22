import type { RetirementCityRecord } from '../retirementDestinations'
import { getRetirementDestinationCities } from '../retirementDestinations'

function lookupKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
}

let lookupByCityCountry: Map<string, RetirementCityRecord> | null = null

function ensureLookup(): Map<string, RetirementCityRecord> {
  if (!lookupByCityCountry) {
    lookupByCityCountry = new Map()
    for (const c of getRetirementDestinationCities()) {
      lookupByCityCountry.set(lookupKey(c.city, c.country), c)
    }
  }
  return lookupByCityCountry
}

export function lookupRetirementCity(
  city: string,
  country: string,
): RetirementCityRecord | null {
  return ensureLookup().get(lookupKey(city, country)) ?? null
}
