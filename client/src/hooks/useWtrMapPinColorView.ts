import { useCallback, useEffect } from 'react'
import {
  applyWhereToLook,
  BUDGET_LEGEND_BAND_IDS,
  EXPAT_LEGEND_TIER_IDS,
  resolveWhereToLook,
  SCORE_LEGEND_BAND_IDS,
  type MapFilters,
} from '../lib/whereToRetire/cityMapScoring'
import type { MapPinColorView } from '../lib/whereToRetire/mapPinDisplay'
import { useMapPinColorView } from './useMapPinColorView'

export function useWtrMapPinColorView(
  filters: MapFilters,
  onFiltersChange: (
    next: MapFilters | ((prev: MapFilters) => MapFilters),
  ) => void,
) {
  const { pinColorView, onPinColorViewChange } = useMapPinColorView()

  const handlePinColorViewChange = useCallback(
    (view: MapPinColorView) => {
      onPinColorViewChange(view)
      if (view === 'expat') {
        onFiltersChange((prev) => {
          const base =
            resolveWhereToLook(prev) === 'us'
              ? applyWhereToLook(prev, 'all')
              : prev
          return base.regionScope === 'both'
            ? { ...base, regionScope: 'international-only' }
            : base
        })
      }
      if (view === 'budget' && filters.sortBy !== 'lowest-budget') {
        onFiltersChange((prev) => ({ ...prev, sortBy: 'lowest-budget' }))
      }
      if (view !== 'expat') {
        onFiltersChange((prev) => ({
          ...prev,
          expatCommunityTiers: [...EXPAT_LEGEND_TIER_IDS],
        }))
      }
      if (view !== 'score') {
        onFiltersChange((prev) => ({
          ...prev,
          scorePinBands: [...SCORE_LEGEND_BAND_IDS],
        }))
      }
      if (view !== 'budget') {
        onFiltersChange((prev) => ({
          ...prev,
          budgetPinBands: [...BUDGET_LEGEND_BAND_IDS],
        }))
      }
    },
    [onPinColorViewChange, onFiltersChange, filters.sortBy],
  )

  useEffect(() => {
    if (pinColorView !== 'expat' || filters.regionScope !== 'both') return
    onFiltersChange((prev) => {
      const base =
        resolveWhereToLook(prev) === 'us'
          ? applyWhereToLook(prev, 'all')
          : prev
      return base.regionScope === 'both'
        ? { ...base, regionScope: 'international-only' }
        : base
    })
  }, [pinColorView, filters.regionScope, onFiltersChange])

  useEffect(() => {
    if (filters.whereToLook !== 'us' || pinColorView !== 'expat') return
    onPinColorViewChange('score')
  }, [filters.whereToLook, pinColorView, onPinColorViewChange])

  return { pinColorView, handlePinColorViewChange }
}
