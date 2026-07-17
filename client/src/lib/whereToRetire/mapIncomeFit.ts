import {
  calcFit,
  taxBadgeLabel,
  taxBadgeTone,
  type RetirementFitResult,
} from '../retirementFormulas'
import { PORTUGAL_TAX_DISCLOSURE_SHORT } from '../calc/portugalTax'
import { FRANCE_TAX_DISCLOSURE_SHORT } from '../calc/franceTax'
import { NETHERLANDS_TAX_DISCLOSURE_SHORT } from '../calc/netherlandsTax'
import {
  ITALY_ART_24_TER_DISCLOSURE_SHORT,
  ITALY_TAX_DISCLOSURE_SHORT,
  isItalyArt24TerEligibleCity,
} from '../calc/italyTax'
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
  /** Short disclosure for Portugal / Netherlands tax estimate (tooltip). */
  taxTooltip?: string
  visaLabel: string
  visaQualifies: boolean
}

export function calcMapIncomeFit(
  mapCity: CityData,
  record: RetirementCityRecord,
  grossMonthly: number,
  filters: Pick<MapFilters, 'lifestyle'>,
  modeledAge?: number,
): RetirementFitResult {
  return calcFit(
    mapCity,
    record,
    grossMonthly,
    resolveMapLifestyle(filters),
    undefined,
    modeledAge,
  )
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
  modeledAge?: number,
): MapIncomeFitDisplay | null {
  const record = lookupRetirementCity(city, country)
  const mapCity = getCityData(city, country)
  if (!record || !mapCity) return null

  const fit = calcMapIncomeFit(
    mapCity,
    record,
    monthlyIncome,
    filters,
    modeledAge,
  )
  const displayTaxRate = fit.taxRate

  return {
    taxLabel: taxBadgeLabel(displayTaxRate, record.country_iso, record.city),
    taxTone: taxBadgeTone(displayTaxRate, record.country_iso, record.city),
    taxTooltip:
      record.country_iso === 'PT' || country.trim() === 'Portugal'
        ? PORTUGAL_TAX_DISCLOSURE_SHORT
        : record.country_iso === 'IT' || country.trim() === 'Italy'
          ? isItalyArt24TerEligibleCity(record.city)
            ? ITALY_ART_24_TER_DISCLOSURE_SHORT
            : ITALY_TAX_DISCLOSURE_SHORT
          : record.country_iso === 'FR' || country.trim() === 'France'
            ? FRANCE_TAX_DISCLOSURE_SHORT
            : record.country_iso === 'NL' || country.trim() === 'Netherlands'
              ? NETHERLANDS_TAX_DISCLOSURE_SHORT
              : undefined,
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
