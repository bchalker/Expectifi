type Props = {
  hasOpenedPrefsOverlay: boolean
  onExplore: () => void
  onOpenPreferences: () => void
}

export function WhereToRetirePanelCtas({
  hasOpenedPrefsOverlay,
  onExplore,
  onOpenPreferences,
}: Props) {
  return (
    <div className="where-to-retire-preview-panel__cta-actions">
      <button
        type="button"
        className="where-to-retire-preview-panel__cta-primary"
        onClick={onExplore}
      >
        Explore where to retire
      </button>
      <button
        type="button"
        className="where-to-retire-preview-panel__cta-secondary"
        onClick={onOpenPreferences}
      >
        {hasOpenedPrefsOverlay
          ? 'Update destination priorities'
          : 'Set Destination priorities'}
      </button>
    </div>
  )
}
