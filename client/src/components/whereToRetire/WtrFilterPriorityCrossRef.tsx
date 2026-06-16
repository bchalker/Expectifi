import type { CorePreferenceKey } from '../../types/preferences'
import type { MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import {
  filterCrossRefActiveSummary,
  openWtrFiltersFromPriority,
  openWtrPreferencesFromFilter,
  PRIORITY_FACTOR_FILTER_CROSS_REF,
  priorityFactorHasActiveFilter,
  type WtrFilterCrossRefKey,
} from '../../lib/whereToRetire/wtrFilterPriorityCrossRef'
import './WtrFilterPriorityCrossRef.scss'

type FilterAnchorProps = {
  crossRefKey: WtrFilterCrossRefKey
  highlighted?: boolean
  children: React.ReactNode
}

export function WtrFilterCrossRefAnchor({
  crossRefKey,
  highlighted = false,
  children,
}: FilterAnchorProps) {
  return (
    <div
      className="wtr-filter-cross-ref-anchor"
      data-wtr-filter-crossref={crossRefKey}
      data-wtr-filter-crossref-highlight={highlighted ? 'true' : undefined}
    >
      {children}
      <p className="wtr-cross-ref-note">
        <span className="wtr-cross-ref-note__text">
          Also weighted in your Priorities
        </span>
        {' · '}
        <button
          type="button"
          className="wtr-cross-ref-note__link"
          onClick={() => openWtrPreferencesFromFilter(crossRefKey)}
        >
          Adjust →
        </button>
      </p>
    </div>
  )
}

type PriorityNoteProps = {
  factorId: CorePreferenceKey
  filters: MapFilters
}

export function WtrPriorityFilterCrossRefNote({
  factorId,
  filters,
}: PriorityNoteProps) {
  if (!priorityFactorHasActiveFilter(filters, factorId)) return null

  const crossRefKey = PRIORITY_FACTOR_FILTER_CROSS_REF[factorId]
  if (!crossRefKey) return null

  const summary = filterCrossRefActiveSummary(filters, crossRefKey)

  return (
    <p className="wtr-cross-ref-note pref-factor-row__filter-cross-ref">
      <span className="wtr-cross-ref-note__text">
        You also have a {summary}
      </span>
      {' · '}
      <button
        type="button"
        className="wtr-cross-ref-note__link"
        onClick={() => openWtrFiltersFromPriority(factorId)}
      >
        Edit filter →
      </button>
    </p>
  )
}
