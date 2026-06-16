import { getTaxVisaData } from './taxVisa'
import { getQualityOfLifeData } from './qualityOfLife'
import { countryToIsoCode } from './costOfLiving'

export type PublicBehaviorLaws = 'strict' | 'moderate' | 'open'

export type CountryPreferenceFields = {
  alcohol_restricted?: boolean
  dress_code_enforced?: boolean
  religious_law_basis?: boolean
  public_behavior_laws?: PublicBehaviorLaws
  estimated_expat_insurance_usd?: number
  disaster_risk_score?: number
  stability_score?: number
  official_language?: string
  language_difficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard'
  avg_broadband_mbps?: number
  flight_hours_from_us?: number
}

const STRICT_SOCIAL_COUNTRIES = new Set([
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Kuwait',
  'Iran',
  'Pakistan',
])

const ALCOHOL_RESTRICTED = new Set([
  'Saudi Arabia',
  'Kuwait',
  'Iran',
  'Pakistan',
  'Bangladesh',
])

const DRESS_CODE_COUNTRIES = new Set([
  'Saudi Arabia',
  'Iran',
  'United Arab Emirates',
  'Qatar',
])

const ENGLISH_OFFICIAL = new Set([
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'New Zealand',
  'Ireland',
  'Singapore',
  'Philippines',
  'Malta',
  'Belize',
  'Barbados',
  'Jamaica',
  'Bahamas',
  'South Africa',
  'India',
  'Kenya',
  'Fiji',
])

const EASY_LANGUAGE = new Set([
  'Spain',
  'Mexico',
  'Portugal',
  'Italy',
  'France',
  'Brazil',
  'Netherlands',
  'Belgium',
  'Ecuador',
  'Colombia',
  'Costa Rica',
  'Panama',
  'Argentina',
  'Chile',
  'Peru',
])

const MODERATE_LANGUAGE = new Set([
  'Germany',
  'Greece',
  'Poland',
  'Romania',
  'Croatia',
  'Turkey',
  'Hungary',
  'Czech Republic',
])

const HARD_LANGUAGE = new Set([
  'Japan',
  'South Korea',
  'Thailand',
  'Vietnam',
  'Egypt',
  'Morocco',
  'Israel',
])

const VERY_HARD_LANGUAGE = new Set([
  'China',
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Kuwait',
  'Iran',
])

const FLIGHT_HOURS: Record<string, number> = {
  Mexico: 3,
  Canada: 3,
  'Costa Rica': 4,
  Panama: 4,
  Portugal: 7,
  Spain: 8,
  Italy: 9,
  Greece: 10,
  France: 8,
  Germany: 9,
  'United Kingdom': 7,
  Ireland: 7,
  Thailand: 18,
  Vietnam: 18,
  Japan: 14,
  Philippines: 16,
  Malaysia: 18,
  Australia: 20,
  'New Zealand': 22,
}

const INSURANCE_USD: Record<string, number> = {
  Portugal: 1800,
  Spain: 2200,
  Mexico: 2400,
  'Costa Rica': 2800,
  Panama: 2600,
  Thailand: 3200,
  Italy: 2000,
  Greece: 1900,
  France: 2400,
  Germany: 2800,
}

function inferLanguageDifficulty(country: string): CountryPreferenceFields['language_difficulty'] {
  if (ENGLISH_OFFICIAL.has(country)) return 'easy'
  if (EASY_LANGUAGE.has(country)) return 'easy'
  if (MODERATE_LANGUAGE.has(country)) return 'moderate'
  if (HARD_LANGUAGE.has(country)) return 'hard'
  if (VERY_HARD_LANGUAGE.has(country)) return 'very_hard'
  const iso = countryToIsoCode(country)
  if (iso?.startsWith('ES') || iso?.startsWith('PT') || iso?.startsWith('IT')) return 'easy'
  return 'moderate'
}

export function getCountryPreferenceFields(country: string): CountryPreferenceFields {
  const trimmed = country.trim()
  const tax = getTaxVisaData(trimmed)
  const qol = getQualityOfLifeData(trimmed)

  const disasterBase = qol
    ? Math.max(0, Math.min(100, Math.round(100 - (qol.pollution_index ?? 30) * 0.35)))
    : 60

  const stabilityBase = qol
    ? Math.max(0, Math.min(100, Math.round(qol.safety_index ?? 60)))
    : 60

  return {
    alcohol_restricted:
      tax?.alcohol_restricted ?? ALCOHOL_RESTRICTED.has(trimmed),
    dress_code_enforced:
      tax?.dress_code_enforced ?? DRESS_CODE_COUNTRIES.has(trimmed),
    religious_law_basis:
      tax?.religious_law_basis ?? STRICT_SOCIAL_COUNTRIES.has(trimmed),
    public_behavior_laws:
      tax?.public_behavior_laws ??
      (STRICT_SOCIAL_COUNTRIES.has(trimmed) ? 'strict' : 'open'),
    estimated_expat_insurance_usd:
      tax?.estimated_expat_insurance_usd ?? INSURANCE_USD[trimmed] ?? 3000,
    disaster_risk_score: tax?.disaster_risk_score ?? 100 - disasterBase,
    stability_score: tax?.stability_score ?? stabilityBase,
    official_language: tax?.official_language,
    language_difficulty: tax?.language_difficulty ?? inferLanguageDifficulty(trimmed),
    avg_broadband_mbps: tax?.avg_broadband_mbps ?? 50,
    flight_hours_from_us: tax?.flight_hours_from_us ?? FLIGHT_HOURS[trimmed] ?? 12,
  }
}

export function computeSocialLawsScore(country: string): number {
  const fields = getCountryPreferenceFields(country)
  let score = 100
  if (fields.alcohol_restricted) score -= 25
  if (fields.dress_code_enforced) score -= 20
  if (fields.religious_law_basis) score -= 20
  if (fields.public_behavior_laws === 'strict') score -= 20
  else if (fields.public_behavior_laws === 'moderate') score -= 5
  return Math.max(0, score)
}

function roundInsuranceUsd(value: number): number {
  if (value < 100) return Math.round(value / 5) * 5
  return Math.round(value / 10) * 10
}

/** Rough monthly expat insurance range from country-level annual estimate. */
export function healthcareInsuranceMonthlyRange(
  country: string,
): { low: number; high: number } {
  const fields = getCountryPreferenceFields(country)
  const monthly = (fields.estimated_expat_insurance_usd ?? 3000) / 12
  const low = roundInsuranceUsd(monthly * 0.9)
  const high = roundInsuranceUsd(monthly * 1.45)
  return { low: Math.max(low, 40), high: Math.max(high, low + 20) }
}

export function formatHealthcareInsuranceMonthlyRange(country: string): string {
  const { low, high } = healthcareInsuranceMonthlyRange(country)
  return `$${low.toLocaleString('en-US')}–${high.toLocaleString('en-US')}`
}

export function computeHealthcareCostScore(
  country: string,
  monthlyIncome: number,
): number {
  const fields = getCountryPreferenceFields(country)
  const annualInsurance = fields.estimated_expat_insurance_usd ?? 3000
  if (monthlyIncome <= 0) return 60
  const pct = (annualInsurance / 12 / monthlyIncome) * 100
  if (pct < 3) return 100
  if (pct < 6) return 75
  if (pct < 10) return 50
  if (pct < 15) return 25
  return 10
}

export function computeDisasterRiskScore(country: string): number {
  const fields = getCountryPreferenceFields(country)
  const risk = fields.disaster_risk_score ?? 40
  return Math.max(0, Math.min(100, Math.round(100 - risk)))
}

export function computePoliticalStabilityScore(country: string): number {
  const fields = getCountryPreferenceFields(country)
  return Math.max(0, Math.min(100, Math.round(fields.stability_score ?? 60)))
}
