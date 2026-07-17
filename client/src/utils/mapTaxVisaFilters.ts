import { getTaxVisaData } from './taxVisa'
import { isItalyArt24TerEligibleCity } from '../lib/calc/italyTax'

/** Foreign-income tax treatment bucket for map filtering (aligned with retirement-tax-visa.json). */
export type ForeignTaxCategory = 'not-taxed-locally' | 'low-flat-rate' | 'standard'

export type ForeignTaxFilter = 'any' | ForeignTaxCategory

/** Territorial / exempt foreign income — see tax_rate_label in retirement-tax-visa.json. */
const NOT_TAXED_LOCALLY_COUNTRIES = new Set([
  'Panama',
  'Costa Rica',
  'Georgia',
  'Malaysia',
  'Paraguay',
  'Ecuador',
  'Belize',
  'Indonesia',
  'Philippines',
  'Hong Kong',
  'Singapore',
  'Nicaragua',
])

/** Dedicated low flat regimes (under ~15%) — see tax_rate_label in retirement-tax-visa.json. */
const LOW_FLAT_RATE_COUNTRIES = new Set([
  'Greece',
  'Cyprus',
  'Bulgaria',
  'Romania',
  'Hungary',
  'Montenegro',
  'Albania',
  'Serbia',
  'Estonia',
  'Slovakia',
])

/** Countries with a named retirement visa program (visa_name in retirement-tax-visa.json). */
const RETIREMENT_VISA_PROGRAM_COUNTRIES = new Set([
  'Panama',
  'Costa Rica',
  'Philippines',
  'Thailand',
  'Malaysia',
  'Ecuador',
  'Dominican Republic',
  'Nicaragua',
  'Belize',
  'Italy',
  'Greece',
  'Cyprus',
  'Malta',
  'Portugal',
  'Spain',
  'Croatia',
  'Indonesia',
  'Bahrain',
  'United Arab Emirates',
  'South Africa',
  'New Zealand',
  'Sri Lanka',
  'Fiji',
])

/**
 * Map a country (and optional city) to a foreign-tax filter bucket.
 * Italy is standard IRPEF except confirmed Art. 24-ter towns → low-flat-rate.
 */
export function foreignTaxCategoryForCountry(
  country: string,
  city?: string | null,
): ForeignTaxCategory {
  const trimmed = country.trim()
  if (NOT_TAXED_LOCALLY_COUNTRIES.has(trimmed)) return 'not-taxed-locally'
  if (trimmed === 'Italy' && isItalyArt24TerEligibleCity(city)) {
    return 'low-flat-rate'
  }
  if (LOW_FLAT_RATE_COUNTRIES.has(trimmed)) return 'low-flat-rate'
  return 'standard'
}

export function passesForeignTaxMapFilter(
  country: string,
  filter: ForeignTaxFilter,
  city?: string | null,
): boolean {
  if (filter === 'any') return true
  return foreignTaxCategoryForCountry(country, city) === filter
}

/** Whether the country has a dedicated named retirement visa in our tax/visa dataset. */
export function hasRetirementVisaProgram(country: string): boolean {
  const trimmed = country.trim()
  if (!trimmed) return false
  if (!RETIREMENT_VISA_PROGRAM_COUNTRIES.has(trimmed)) return false
  return getTaxVisaData(trimmed) != null
}
