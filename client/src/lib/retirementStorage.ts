import {
  getDoNotTravelAdvisoryCountries,
  hasDoNotTravelAdvisory,
} from './travelAdvisories'

export type FavoriteCityEntry = {
  city: string
  country: string
  country_iso: string
  savedAt: string
}

export type ExclusionReason = 'travel_advisory' | 'manual'

export type ExcludedCountryEntry = {
  country: string
  reason: ExclusionReason
}

const MANUAL_EXCLUDED_COUNTRIES_KEY = 'retirement_excluded_countries'
const ADVISORY_INCLUDED_OVERRIDES_KEY = 'retirement_advisory_included_overrides'
const FAVORITE_CITIES_KEY = 'retirement_favorite_cities'

function readStringList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

function writeStringList(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(values))
  dispatchStorageChange()
}

/** User-initiated country exclusions (search / detail panel). */
export function getManualExcludedCountries(): string[] {
  return readStringList(MANUAL_EXCLUDED_COUNTRIES_KEY)
}

/** Countries the user chose to include despite a default travel-advisory exclusion. */
export function getAdvisoryIncludedOverrides(): string[] {
  return readStringList(ADVISORY_INCLUDED_OVERRIDES_KEY)
}

function setManualExcludedCountries(countries: string[]): void {
  writeStringList(MANUAL_EXCLUDED_COUNTRIES_KEY, countries)
}

function setAdvisoryIncludedOverrides(countries: string[]): void {
  writeStringList(ADVISORY_INCLUDED_OVERRIDES_KEY, countries)
}

/** Same source as the Filters “Hide unsafe cities” toggle (`hasTravelAdvisory`). */
export function getDefaultTravelAdvisoryExcludedCountries(): readonly string[] {
  return getDoNotTravelAdvisoryCountries()
}

export function isDefaultTravelAdvisoryExclusion(country: string): boolean {
  return hasDoNotTravelAdvisory(country)
}

/** Merged exclusion list used for map filtering and counts. */
export function getExcludedCountries(): string[] {
  const overrides = new Set(getAdvisoryIncludedOverrides())
  const advisory = getDoNotTravelAdvisoryCountries().filter((country) => !overrides.has(country))
  const manual = getManualExcludedCountries()
  return [...new Set([...advisory, ...manual])]
}

export function getExcludedCountryEntries(): ExcludedCountryEntry[] {
  const overrides = new Set(getAdvisoryIncludedOverrides())
  const manual = new Set(getManualExcludedCountries())
  const entries: ExcludedCountryEntry[] = []

  for (const country of getDoNotTravelAdvisoryCountries()) {
    if (!overrides.has(country)) {
      entries.push({ country, reason: 'travel_advisory' })
    }
  }

  for (const country of manual) {
    if (hasDoNotTravelAdvisory(country) && !overrides.has(country)) continue
    entries.push({ country, reason: 'manual' })
  }

  entries.sort((a, b) => a.country.localeCompare(b.country))
  return entries
}

/** True when exclusions differ from the default travel-advisory set alone. */
export function hasNonDefaultUserExclusions(
  entries: readonly ExcludedCountryEntry[] = getExcludedCountryEntries(),
): boolean {
  const hasManual = entries.some((entry) => entry.reason === 'manual')
  const advisoryCount = entries.filter((entry) => entry.reason === 'travel_advisory').length
  const overrideCount = getDoNotTravelAdvisoryCountries().length - advisoryCount
  return hasManual || overrideCount > 0
}

export function setExcludedCountries(countries: string[]): void {
  setManualExcludedCountries(countries)
}

export function addExcludedCountry(country: string): void {
  if (hasDoNotTravelAdvisory(country)) {
    setAdvisoryIncludedOverrides(
      getAdvisoryIncludedOverrides().filter((name) => name !== country),
    )
    return
  }
  const current = getManualExcludedCountries()
  if (current.includes(country)) return
  setManualExcludedCountries([...current, country])
}

export function removeExcludedCountry(country: string): void {
  if (hasDoNotTravelAdvisory(country)) {
    const overrides = getAdvisoryIncludedOverrides()
    if (!overrides.includes(country)) {
      setAdvisoryIncludedOverrides([...overrides, country])
    }
    return
  }
  setManualExcludedCountries(getManualExcludedCountries().filter((c) => c !== country))
}

export function clearExcludedCountries(): void {
  setManualExcludedCountries([])
  setAdvisoryIncludedOverrides([])
}

export const RETIREMENT_EXCLUSIONS_EVENT = 'retirement-exclusions-changed'
export const RETIREMENT_STORAGE_EVENT = RETIREMENT_EXCLUSIONS_EVENT

function dispatchStorageChange(): void {
  window.dispatchEvent(new Event(RETIREMENT_STORAGE_EVENT))
}

export function getFavoriteCities(): FavoriteCityEntry[] {
  try {
    const raw = localStorage.getItem(FAVORITE_CITIES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is FavoriteCityEntry =>
        entry != null &&
        typeof entry === 'object' &&
        typeof entry.city === 'string' &&
        typeof entry.country === 'string' &&
        typeof entry.country_iso === 'string' &&
        typeof entry.savedAt === 'string',
    )
  } catch {
    return []
  }
}

export function toggleFavoriteCity(entry: {
  city: string
  country: string
  country_iso: string
}): boolean {
  const current = getFavoriteCities()
  const exists = current.some(
    (c) => c.city === entry.city && c.country === entry.country,
  )
  const normalized = {
    city: entry.city,
    country: entry.country,
    country_iso: entry.country_iso.trim(),
  }
  if (exists) {
    localStorage.setItem(
      FAVORITE_CITIES_KEY,
      JSON.stringify(
        current.filter((c) => !(c.city === entry.city && c.country === entry.country)),
      ),
    )
    dispatchStorageChange()
    return false
  }
  localStorage.setItem(
    FAVORITE_CITIES_KEY,
    JSON.stringify([
      ...current,
      { ...normalized, savedAt: new Date().toISOString() },
    ]),
  )
  dispatchStorageChange()
  return true
}

export function removeFavoriteCity(city: string, country: string): void {
  const current = getFavoriteCities()
  localStorage.setItem(
    FAVORITE_CITIES_KEY,
    JSON.stringify(
      current.filter((c) => !(c.city === city && c.country === country)),
    ),
  )
  dispatchStorageChange()
}

export function isFavorited(city: string, country: string): boolean {
  return getFavoriteCities().some((c) => c.city === city && c.country === country)
}
