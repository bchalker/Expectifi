import { useCallback, useSyncExternalStore } from 'react'
import {
  addExcludedCountry,
  clearExcludedCountries,
  getExcludedCountries,
  removeExcludedCountry,
  RETIREMENT_EXCLUSIONS_EVENT,
  setExcludedCountries,
} from '../lib/retirementStorage'

function subscribe(onStoreChange: () => void) {
  window.addEventListener(RETIREMENT_EXCLUSIONS_EVENT, onStoreChange)
  return () => window.removeEventListener(RETIREMENT_EXCLUSIONS_EVENT, onStoreChange)
}

function getSnapshot() {
  return getExcludedCountries().join('\u0001')
}

export function useRetirementExclusions() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const excludedCountries = getExcludedCountries()

  return {
    excludedCountries,
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
