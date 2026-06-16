import { useCallback, useSyncExternalStore } from 'react'
import {
  addExcludedCountry,
  clearExcludedCountries,
  getExcludedCountries,
  getExcludedCountryEntries,
  getFavoriteCities,
  isFavorited,
  removeExcludedCountry,
  removeFavoriteCity,
  RETIREMENT_STORAGE_EVENT,
  setExcludedCountries,
  toggleFavoriteCity,
  type ExcludedCountryEntry,
  type FavoriteCityEntry,
} from '../lib/retirementStorage'

function subscribe(onStoreChange: () => void) {
  window.addEventListener(RETIREMENT_STORAGE_EVENT, onStoreChange)
  return () => window.removeEventListener(RETIREMENT_STORAGE_EVENT, onStoreChange)
}

function getSnapshot() {
  const favorites = getFavoriteCities()
  return [
    getExcludedCountries().join('\u0001'),
    getExcludedCountryEntries()
      .map((entry) => `${entry.country}\u0002${entry.reason}`)
      .join('\u0003'),
    favorites.map((f) => `${f.city}\u0001${f.country}`).join('\u0002'),
  ].join('|')
}

/** Excluded countries and favorites from localStorage. */
export function useRetirementMapStorage() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const excludedCountries = getExcludedCountries()
  const excludedCountryEntries = getExcludedCountryEntries()
  const favoriteCities = getFavoriteCities()

  return {
    excludedCountries,
    excludedCountryEntries,
    favoriteCities,
    setExcludedCountries: useCallback((countries: string[]) => {
      setExcludedCountries(countries)
    }, []),
    addExcludedCountry: useCallback((country: string) => {
      addExcludedCountry(country)
    }, []),
    removeExcludedCountry: useCallback((country: string) => {
      removeExcludedCountry(country)
    }, []),
    clearExcludedCountries: useCallback(() => {
      clearExcludedCountries()
    }, []),
    toggleFavoriteCity: useCallback(
      (entry: { city: string; country: string; country_iso: string }) => {
        return toggleFavoriteCity(entry)
      },
      [],
    ),
    removeFavoriteCity: useCallback((city: string, country: string) => {
      removeFavoriteCity(city, country)
    }, []),
    isFavoritedCity: useCallback((city: string, country: string) => {
      return isFavorited(city, country)
    }, []),
  }
}

export type { ExcludedCountryEntry, FavoriteCityEntry }
