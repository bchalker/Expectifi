import { forwardRef } from 'react'
import { IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react'
import './WtrMapToolButton.scss'

type Props = {
  active: boolean
  activeFilterCount: number
  filtersOpen: boolean
  onToggle: () => void
  compact?: boolean
}

export const WtrMapFilterButton = forwardRef<HTMLButtonElement, Props>(function WtrMapFilterButton(
  { active, activeFilterCount, filtersOpen, onToggle, compact = false },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={[
        'wtr-map-tool-btn',
        compact && 'wtr-map-tool-btn--compact',
        filtersOpen && 'wtr-map-tool-btn--active',
        active && 'wtr-map-tool-btn--has-active',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-expanded={filtersOpen}
      aria-controls="wtr-map-filters-panel"
      aria-label={
        activeFilterCount > 0
          ? `${filtersOpen ? 'Hide' : 'Show'} filters (${activeFilterCount} active)`
          : filtersOpen
            ? 'Hide filters'
            : 'Show filters'
      }
      onClick={onToggle}
    >
      <span className="wtr-map-tool-btn__icon-stack" aria-hidden>
        <IconAdjustmentsHorizontal
          size={compact ? 16 : 20}
          stroke={1.5}
          className={[
            'wtr-map-tool-btn__icon',
            'wtr-map-tool-btn__icon--filter',
            filtersOpen && 'wtr-map-tool-btn__icon--hidden',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        <IconX
          size={compact ? 16 : 20}
          stroke={1.5}
          className={[
            'wtr-map-tool-btn__icon',
            'wtr-map-tool-btn__icon--close',
            !filtersOpen && 'wtr-map-tool-btn__icon--hidden',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </span>
      {activeFilterCount > 0 && !filtersOpen ? (
        <span className="wtr-map-tool-btn__dot" aria-hidden />
      ) : null}
    </button>
  )
})
