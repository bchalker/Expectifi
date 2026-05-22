import { getFlagEmoji } from '../regionUtils'
import { countryToIsoCode, getAllMapCities } from '../../utils/costOfLiving'

export type MapCountryOption = {
  name: string
  iso: string
  flag: string
}

let cachedCountries: MapCountryOption[] | null = null

export function getMapCountryCatalog(): MapCountryOption[] {
  if (cachedCountries) return cachedCountries

  const byName = new Map<string, MapCountryOption>()
  for (const row of getAllMapCities()) {
    if (byName.has(row.country)) continue
    const iso = countryToIsoCode(row.country)
    if (!iso) continue
    byName.set(row.country, {
      name: row.country,
      iso,
      flag: getFlagEmoji(iso),
    })
  }

  cachedCountries = [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  return cachedCountries
}
