type Props = {
  hasOpenedPrefsOverlay: boolean;
  onExplore: () => void;
  onOpenPreferences: () => void;
};

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
        Where to Retire
      </button>
      <button
        type="button"
        className="where-to-retire-preview-panel__cta-secondary"
        onClick={onOpenPreferences}
      >
        {hasOpenedPrefsOverlay
          ? "Update destination priorities"
          : "Set your priorities"}
      </button>
    </div>
  );
}
