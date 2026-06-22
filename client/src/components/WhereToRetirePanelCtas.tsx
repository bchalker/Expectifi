import { IconArrowNarrowRightDashed, IconMapSearch } from "@tabler/icons-react";

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
        <span
          className="where-to-retire-preview-panel__cta-primary-icon"
          aria-hidden
        >
          <span className="where-to-retire-preview-panel__cta-primary-icon-stack">
            <span className="where-to-retire-preview-panel__cta-primary-icon-layer">
              <IconMapSearch size={16} stroke={1.5} />
            </span>
            <span className="where-to-retire-preview-panel__cta-primary-icon-layer">
              <IconArrowNarrowRightDashed size={16} stroke={1.5} />
            </span>
          </span>
        </span>
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
