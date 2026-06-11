import { IconAdjustmentsHorizontal } from '@tabler/icons-react'

type Props = {
  hasSavedPrefs: boolean
  onOpenWizard: () => void
}

export function IncomeHarvestPreferencesEntry({ hasSavedPrefs, onOpenWizard }: Props) {
  if (!hasSavedPrefs) {
    return (
      <div className="where-to-retire-preview-panel__prefs-callout">
        <div className="where-to-retire-preview-panel__prefs-callout-head">
          <IconAdjustmentsHorizontal
            size={14}
            stroke={1.5}
            className="where-to-retire-preview-panel__prefs-callout-icon"
            aria-hidden
          />
          <div className="where-to-retire-preview-panel__prefs-callout-copy">
            <p className="where-to-retire-preview-panel__prefs-callout-title">
              Personalize your results
            </p>
            <p className="where-to-retire-preview-panel__prefs-callout-sub">
              Set your priorities so scores reflect what matters to you.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="where-to-retire-preview-panel__prefs-callout-btn"
          onClick={onOpenWizard}
        >
          Set preferences →
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="where-to-retire-preview-panel__prefs-link"
      onClick={onOpenWizard}
    >
      <IconAdjustmentsHorizontal
        size={12}
        stroke={1.5}
        className="where-to-retire-preview-panel__prefs-link-icon"
        aria-hidden
      />
      Update score preferences
    </button>
  )
}
