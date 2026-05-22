import {
  calcFit,
  getEffectiveTaxRate,
  taxBadgeLabel,
  taxBadgeTone,
  type RetirementFitResult,
} from '../retirementFormulas'
import type { RetirementCityRecord } from '../retirementDestinations'
import { formatUsd } from '../../utils/costOfLiving'
import type { MapFilters, ScoredMapCity } from './cityMapScoring'
import { lookupRetirementCity } from './retirementCityLookup'

export const DEFAULT_HEALTH_INS_MONTHLY_USD = 200

export type MapIncomeFitDisplay = {
  taxLabel: string
  taxTone: 'green' | 'amber' | 'red'
  visaLabel: string
  visaQualifies: boolean
}

export function calcMapIncomeFit(
  record: RetirementCityRecord,
  grossMonthly: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>,
): RetirementFitResult {
  const healthUsd = filters.includeHealthIns ? filters.healthInsMonthlyUsd : 0
  return calcFit(record, grossMonthly, filters.includeHealthIns, healthUsd)
}

export function monthlyOutflowForMapCity(
  scored: ScoredMapCity,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>,
): number {
  const record = lookupRetirementCity(scored.city.city, scored.city.country)
  if (record) {
    return calcMapIncomeFit(record, monthlyIncome, filters).trueCOL
  }
  return scored.monthlyBudget
}

export function mapIncomeFitDisplayForCity(
  city: string,
  country: string,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>,
): MapIncomeFitDisplay | null {
  const record = lookupRetirementCity(city, country)
  if (!record) return null

  const fit = calcMapIncomeFit(record, monthlyIncome, filters)
  const displayTaxRate = getEffectiveTaxRate(record.country_iso)

  return {
    taxLabel: taxBadgeLabel(displayTaxRate),
    taxTone: taxBadgeTone(displayTaxRate),
    visaLabel: fit.visaQualifies
      ? 'Visa-Friendly'
      : `Visa (Needs ${formatUsd(record.visa.income_requirement_monthly_usd)}/mo)`,
    visaQualifies: fit.visaQualifies,
  }
}

export function passesVisaQualifyingMapFilter(
  scored: ScoredMapCity,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd' | 'visaQualifyingOnly'>,
): boolean {
  if (!filters.visaQualifyingOnly) return true
  const record = lookupRetirementCity(scored.city.city, scored.city.country)
  if (!record) return false
  return calcMapIncomeFit(record, monthlyIncome, filters).visaQualifies
}
