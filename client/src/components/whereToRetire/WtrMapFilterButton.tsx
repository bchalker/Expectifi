import { IconAdjustmentsHorizontal } from '@tabler/icons-react'

type Props = {
  active: boolean
  activeFilterCount: number
  filtersOpen: boolean
  onToggle: () => void
}

export function WtrMapFilterButton({ active, activeFilterCount, filtersOpen, onToggle }: Props) {
  return (
    <button
      type="button"
      className={[
        'where-to-retire__filter-btn',
        'where-to-retire__filter-btn--mobile',
        filtersOpen && 'where-to-retire__filter-btn--active',
        active && 'where-to-retire__filter-btn--has-active',
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
      <IconAdjustmentsHorizontal size={20} stroke={1.5} aria-hidden />
      {activeFilterCount > 0 ? (
        <span className="where-to-retire__filter-btn-dot" aria-hidden />
      ) : null}
    </button>
  )
}
