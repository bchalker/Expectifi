import type { CorePreferenceKey } from '../../types/preferences'
import type {
  ClimateFilter,
  ForeignTaxFilter,
  HealthcareFilter,
  MapFilters,
  SafetyFilter,
} from './cityMapScoring'
import { wizardStepForFactor } from '../../utils/preferenceFactors'

/** Hard-filter rows that overlap with Travel Priorities weights. */
export type WtrFilterCrossRefKey =
  | 'foreignTax'
  | 'healthcare'
  | 'climate'
  | 'safety'
  | 'goodAirOnly'
  | 'hideAdvisories'

/** Filters drawer scroll/highlight targets (includes meta Fit score filter). */
export type WtrFilterScrollTarget = WtrFilterCrossRefKey | 'minRetirementScore'

export const WTR_OPEN_PREFERENCES_EVENT = 'wtr-open-preferences' as const
export const WTR_OPEN_FILTERS_EVENT = 'wtr-open-filters' as const

export type WtrOpenPreferencesDetail = {
  step?: number
  factorId?: CorePreferenceKey
}

export type WtrOpenFiltersDetail = {
  crossRefKey?: WtrFilterScrollTarget
}

export const FILTER_CROSS_REF_PRIORITY_FACTORS: Record<
  WtrFilterCrossRefKey,
  CorePreferenceKey[]
> = {
  foreignTax: ['taxEfficiency'],
  healthcare: ['healthcareQuality', 'healthcareCost'],
  climate: ['climate'],
  safety: ['safety'],
  goodAirOnly: ['airQuality'],
  hideAdvisories: ['politicalStability', 'disasterRisk'],
}

export const PRIORITY_FACTOR_FILTER_CROSS_REF: Partial<
  Record<CorePreferenceKey, WtrFilterCrossRefKey>
> = {
  taxEfficiency: 'foreignTax',
  healthcareQuality: 'healthcare',
  healthcareCost: 'healthcare',
  climate: 'climate',
  safety: 'safety',
  airQuality: 'goodAirOnly',
  politicalStability: 'hideAdvisories',
  disasterRisk: 'hideAdvisories',
}

const FOREIGN_TAX_VALUE_LABELS: Record<ForeignTaxFilter, string> = {
  any: 'Any',
  'not-taxed-locally': '10%+',
  'low-flat-rate': '20%',
  standard: '30%+',
}

const HEALTHCARE_VALUE_LABELS: Record<HealthcareFilter, string> = {
  any: 'Any',
  'good-care': 'Good care+',
  excellent: 'World-class only',
}

const SAFETY_VALUE_LABELS: Record<SafetyFilter, string> = {
  any: 'Any',
  'reasonably-safe': '55+',
  'very-safe': '75+',
}

const CLIMATE_VALUE_LABELS: Record<ClimateFilter, string> = {
  any: 'Any climate',
  'warm-year-round': 'Warm year-round',
  mediterranean: 'Mediterranean',
  tropical: 'Tropical',
  'four-seasons': 'Four seasons',
}

const FILTER_ROW_LABELS: Record<WtrFilterCrossRefKey, string> = {
  foreignTax: 'Taxes under',
  healthcare: 'Healthcare',
  climate: 'Climate',
  safety: 'Safety',
  goodAirOnly: 'Good air only',
  hideAdvisories: 'Hide unsafe cities',
}

export function isFilterCrossRefActive(
  filters: MapFilters,
  key: WtrFilterCrossRefKey,
): boolean {
  switch (key) {
    case 'foreignTax':
      return filters.foreignTax !== 'any'
    case 'healthcare':
      return filters.healthcare !== 'any'
    case 'climate':
      return filters.climate !== 'any'
    case 'safety':
      return filters.safety !== 'any'
    case 'goodAirOnly':
      return filters.goodAirOnly
    case 'hideAdvisories':
      return filters.hideAdvisories
    default:
      return false
  }
}

export function formatActiveFilterCrossRefValue(
  filters: MapFilters,
  key: WtrFilterCrossRefKey,
): string {
  switch (key) {
    case 'foreignTax':
      return FOREIGN_TAX_VALUE_LABELS[filters.foreignTax]
    case 'healthcare':
      return HEALTHCARE_VALUE_LABELS[filters.healthcare]
    case 'climate':
      return CLIMATE_VALUE_LABELS[filters.climate]
    case 'safety':
      return SAFETY_VALUE_LABELS[filters.safety]
    case 'goodAirOnly':
      return 'on'
    case 'hideAdvisories':
      return 'on'
    default:
      return ''
  }
}

export function filterCrossRefActiveSummary(
  filters: MapFilters,
  key: WtrFilterCrossRefKey,
): string {
  const rowLabel = FILTER_ROW_LABELS[key]
  const value = formatActiveFilterCrossRefValue(filters, key)
  if (key === 'goodAirOnly' || key === 'hideAdvisories') {
    return `${rowLabel} filter on`
  }
  return `${rowLabel} filter set to ${value}`
}

export function openWtrPreferencesFromFilter(crossRefKey: WtrFilterCrossRefKey): void {
  const [primaryFactor] = FILTER_CROSS_REF_PRIORITY_FACTORS[crossRefKey]
  const detail: WtrOpenPreferencesDetail = {
    step: wizardStepForFactor(primaryFactor),
    factorId: primaryFactor,
  }
  window.dispatchEvent(
    new CustomEvent<WtrOpenPreferencesDetail>(WTR_OPEN_PREFERENCES_EVENT, {
      detail,
    }),
  )
}

export function openWtrFiltersFromPriority(
  factorId: CorePreferenceKey,
): void {
  const crossRefKey = PRIORITY_FACTOR_FILTER_CROSS_REF[factorId]
  const detail: WtrOpenFiltersDetail = crossRefKey ? { crossRefKey } : {}
  window.dispatchEvent(
    new CustomEvent<WtrOpenFiltersDetail>(WTR_OPEN_FILTERS_EVENT, { detail }),
  )
}

export function priorityFactorHasActiveFilter(
  filters: MapFilters,
  factorId: CorePreferenceKey,
): boolean {
  const crossRefKey = PRIORITY_FACTOR_FILTER_CROSS_REF[factorId]
  if (!crossRefKey) return false
  return isFilterCrossRefActive(filters, crossRefKey)
}
