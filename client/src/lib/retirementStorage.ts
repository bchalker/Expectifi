export type FavoriteCityEntry = {
  city: string
  country: string
  country_iso: string
  savedAt: string
}

const EXCLUDED_COUNTRIES_KEY = 'retirement_excluded_countries'
const FAVORITE_CITIES_KEY = 'retirement_favorite_cities'

export function getExcludedCountries(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_COUNTRIES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function setExcludedCountries(countries: string[]): void {
  localStorage.setItem(EXCLUDED_COUNTRIES_KEY, JSON.stringify(countries))
  dispatchStorageChange()
}

export function addExcludedCountry(country: string): void {
  const current = getExcludedCountries()
  if (current.includes(country)) return
  setExcludedCountries([...current, country])
}

export function removeExcludedCountry(country: string): void {
  setExcludedCountries(getExcludedCountries().filter((c) => c !== country))
}

export function clearExcludedCountries(): void {
  setExcludedCountries([])
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
