import { useCallback, useState } from 'react'
import { PreferencesWizard } from './preferences/PreferencesWizard'
import { PreferencesWizardModal } from './preferences/PreferencesWizardModal'
import type { RetirementPreferences } from '../types/preferences'
import { useRetirementPreferences } from '../hooks/useRetirementPreferences'
import './ConfigPreferencesTab.scss'
import './preferences/PreferencesWizard.scss'

type Props = {
  onRescore?: () => void
  onRetakeWizard?: () => void
}

export function ConfigPreferencesTab({ onRescore, onRetakeWizard }: Props) {
  const { prefs, setPrefs } = useRetirementPreferences()
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [retakeOpen, setRetakeOpen] = useState(false)

  const handleChange = useCallback(
    (next: RetirementPreferences) => {
      setPrefs(next)
      onRescore?.()
      setSavedMessage('Preferences updated — map rescored')
    },
    [setPrefs, onRescore],
  )

  const handleRetake = useCallback(() => {
    if (onRetakeWizard) {
      onRetakeWizard()
      return
    }
    setRetakeOpen(true)
  }, [onRetakeWizard])

  const handleRetakeComplete = useCallback(
    (next: RetirementPreferences) => {
      setPrefs(next)
      setRetakeOpen(false)
      onRescore?.()
      setSavedMessage('Preferences updated — map rescored')
    },
    [setPrefs, onRescore],
  )

  return (
    <div className="config-preferences-tab">
      {savedMessage ? (
        <p className="config-preferences-tab__saved" role="status">
          {savedMessage}
        </p>
      ) : null}
      <PreferencesWizard
        mode="settings"
        initialValues={prefs}
        onChange={handleChange}
        onRetake={handleRetake}
      />
      <PreferencesWizardModal
        open={retakeOpen}
        onClose={() => setRetakeOpen(false)}
        initialValues={prefs}
        onComplete={handleRetakeComplete}
        allowDismiss
      />
    </div>
  )
}
