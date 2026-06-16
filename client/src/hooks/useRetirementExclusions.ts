import { useCallback, useSyncExternalStore } from 'react'
import {
  addExcludedCountry,
  clearExcludedCountries,
  getExcludedCountries,
  getExcludedCountryEntries,
  removeExcludedCountry,
  RETIREMENT_EXCLUSIONS_EVENT,
  setExcludedCountries,
} from '../lib/retirementStorage'

function subscribe(onStoreChange: () => void) {
  window.addEventListener(RETIREMENT_EXCLUSIONS_EVENT, onStoreChange)
  return () => window.removeEventListener(RETIREMENT_EXCLUSIONS_EVENT, onStoreChange)
}

function getSnapshot() {
  return [
    getExcludedCountries().join('\u0001'),
    getExcludedCountryEntries()
      .map((entry) => `${entry.country}\u0002${entry.reason}`)
      .join('\u0003'),
  ].join('|')
}

export function useRetirementExclusions() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const excludedCountries = getExcludedCountries()
  const excludedCountryEntries = getExcludedCountryEntries()

  return {
    excludedCountries,
    excludedCountryEntries,
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
  }
}
