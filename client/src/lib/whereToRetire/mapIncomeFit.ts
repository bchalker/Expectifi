import {
  calcFit,
  getEffectiveTaxRate,
  taxBadgeLabel,
  taxBadgeTone,
  type RetirementFitResult,
} from '../retirementFormulas'
import type { RetirementCityRecord } from '../retirementDestinations'
import {
  calculateMonthlyBudget,
  getCityData,
  type CityData,
} from '../../utils/costOfLiving'
import { resolveMapLifestyle, type MapFilters, type ScoredMapCity } from './cityMapScoring'
import { lookupRetirementCity } from './retirementCityLookup'
import { formatUsd } from '../../utils/costOfLiving'

export type MapIncomeFitDisplay = {
  taxLabel: string
  taxTone: 'green' | 'amber' | 'red'
  visaLabel: string
  visaQualifies: boolean
}

export function calcMapIncomeFit(
  mapCity: CityData,
  record: RetirementCityRecord,
  grossMonthly: number,
  filters: Pick<MapFilters, 'lifestyle'>,
): RetirementFitResult {
  return calcFit(mapCity, record, grossMonthly, resolveMapLifestyle(filters))
}

export function monthlyOutflowForMapCity(
  scored: ScoredMapCity,
  _monthlyIncome: number,
  filters: Pick<MapFilters, 'lifestyle'>,
): number {
  return calculateMonthlyBudget(scored.city, resolveMapLifestyle(filters)).total
}

export function mapIncomeFitDisplayForCity(
  city: string,
  country: string,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'lifestyle'>,
): MapIncomeFitDisplay | null {
  const record = lookupRetirementCity(city, country)
  const mapCity = getCityData(city, country)
  if (!record || !mapCity) return null

  const fit = calcMapIncomeFit(mapCity, record, monthlyIncome, filters)
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
  filters: Pick<MapFilters, 'lifestyle' | 'visaQualifyingOnly'>,
): boolean {
  if (!filters.visaQualifyingOnly) return true
  const record = lookupRetirementCity(scored.city.city, scored.city.country)
  if (!record) return false
  return calcMapIncomeFit(scored.city, record, monthlyIncome, filters).visaQualifies
}
