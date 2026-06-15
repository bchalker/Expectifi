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
  const [hasSavedPrefs, setHasSavedPrefs] = useState(
    () => loadRetirementPreferences(config) != null,
  )

  const syncSavedPrefsFlag = useCallback(() => {
    setHasSavedPrefs(loadRetirementPreferences(config) != null)
  }, [config])

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
      syncSavedPrefsFlag()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('retirement-preferences-updated', onUpdated)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('retirement-preferences-updated', onUpdated)
    }
  }, [config.storageKey, config, syncSavedPrefsFlag])

  const setPrefs = useCallback(
    (next: RetirementPreferences | ((prev: RetirementPreferences) => RetirementPreferences)) => {
      setPrefsState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        const normalized = normalizeRetirementPreferences(resolved)
        saveRetirementPreferences(normalized, config)
        window.dispatchEvent(new CustomEvent('retirement-preferences-updated'))
        setHasSavedPrefs(true)
        return normalized
      })
    },
    [config],
  )

  const reloadPrefs = useCallback(() => {
    setPrefsState(loadRetirementPreferences(config) ?? { ...DEFAULT_PREFERENCES, dailyLife: [] })
    syncSavedPrefsFlag()
  }, [config, syncSavedPrefsFlag])

  const resetPrefs = useCallback(() => {
    setPrefsState({ ...DEFAULT_PREFERENCES, dailyLife: [] })
    setHasSavedPrefs(false)
  }, [])

  return {
    prefs,
    setPrefs,
    reloadPrefs,
    resetPrefs,
    hasSavedPrefs,
  }
}
