import { useCallback, useEffect, useState } from 'react'
import type { RetirementPreferences, WizardConfig } from '../types/preferences'
import {
  DEFAULT_PREFERENCES,
  RETIREMENT_WIZARD_CONFIG,
  loadRetirementPreferences,
  normalizeRetirementPreferences,
  saveRetirementPreferences,
} from '../types/preferences'

export function useRetirementPreferences(config: WizardConfig = RETIREMENT_WIZARD_CONFIG) {
  const [prefs, setPrefsState] = useState<RetirementPreferences>(() =>
    loadRetirementPreferences(config) ?? { ...DEFAULT_PREFERENCES, dailyLife: [] },
  )

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== config.storageKey) return
      setPrefsState(
        event.newValue
          ? normalizeRetirementPreferences(JSON.parse(event.newValue))
          : { ...DEFAULT_PREFERENCES, dailyLife: [] },
      )
    }
    const onUpdated = () => {
      setPrefsState(
        loadRetirementPreferences(config) ?? { ...DEFAULT_PREFERENCES, dailyLife: [] },
      )
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('retirement-preferences-updated', onUpdated)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('retirement-preferences-updated', onUpdated)
    }
  }, [config.storageKey])

  const setPrefs = useCallback(
    (next: RetirementPreferences | ((prev: RetirementPreferences) => RetirementPreferences)) => {
      setPrefsState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        const normalized = normalizeRetirementPreferences(resolved)
        saveRetirementPreferences(normalized, config)
        window.dispatchEvent(new CustomEvent('retirement-preferences-updated'))
        return normalized
      })
    },
    [config],
  )

  const reloadPrefs = useCallback(() => {
    setPrefsState(loadRetirementPreferences(config) ?? { ...DEFAULT_PREFERENCES, dailyLife: [] })
  }, [config])

  const resetPrefs = useCallback(() => {
    setPrefsState({ ...DEFAULT_PREFERENCES, dailyLife: [] })
  }, [])

  return {
    prefs,
    setPrefs,
    reloadPrefs,
    resetPrefs,
    hasSavedPrefs: loadRetirementPreferences(config) != null,
  }
}
