import { useCallback, useState } from 'react'
import { useDestinationPrefsOverlayOpened } from '../hooks/useDestinationPrefsOverlayOpened'
import { useRetirementPreferences } from '../hooks/useRetirementPreferences'
import { APP_PATHS, navigateApp } from '../lib/appPaths'
import { stashWtrExplorationIncome } from '../lib/whereToRetire/wtrPreviewIncome'
import { PreferencesWizardModal } from './preferences/PreferencesWizardModal'
import { WhereToRetirePanelCtas } from './WhereToRetirePanelCtas'
import { WtrTravelIllustration } from './WtrTravelIllustration'
import './IncomeHarvestPreviewPanel.scss'
import './WhereToRetirePanelEntry.scss'

type Props = {
  monthlyIncome: number
  preferencesWizardOpen?: boolean
  onPreferencesWizardOpenChange?: (open: boolean) => void
  className?: string
}

export function WhereToRetirePanelEntry({
  monthlyIncome,
  preferencesWizardOpen: preferencesWizardOpenProp,
  onPreferencesWizardOpenChange,
  className = '',
}: Props) {
  const { prefs, setPrefs } = useRetirementPreferences()
  const hasOpenedPrefsOverlay = useDestinationPrefsOverlayOpened()
  const [preferencesWizardOpenInternal, setPreferencesWizardOpenInternal] = useState(false)
  const preferencesWizardOpen = preferencesWizardOpenProp ?? preferencesWizardOpenInternal
  const setPreferencesWizardOpen = onPreferencesWizardOpenChange ?? setPreferencesWizardOpenInternal

  const handlePreferencesComplete = useCallback(
    (next: typeof prefs) => {
      setPrefs(next)
      setPreferencesWizardOpen(false)
    },
    [setPrefs, setPreferencesWizardOpen],
  )

  const handleExplore = () => {
    stashWtrExplorationIncome(monthlyIncome)
    navigateApp(APP_PATHS.whereToRetire)
  }

  return (
    <aside
      className={['wtr-panel-entry', className].filter(Boolean).join(' ')}
      aria-label="Where to Retire"
    >
      <div className="wtr-panel-entry__travel-mark" aria-hidden>
        <WtrTravelIllustration />
      </div>

      <WhereToRetirePanelCtas
        hasOpenedPrefsOverlay={hasOpenedPrefsOverlay}
        onExplore={handleExplore}
        onOpenPreferences={() => setPreferencesWizardOpen(true)}
      />

      <PreferencesWizardModal
        open={preferencesWizardOpen}
        onClose={() => setPreferencesWizardOpen(false)}
        initialValues={prefs}
        onComplete={handlePreferencesComplete}
      />
    </aside>
  )
}
