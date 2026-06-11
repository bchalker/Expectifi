import { englishFriendlinessScoreForCountry } from './englishProficiency'
import { expatCommunityPinTier } from './expatInfo'
import { getCountryPreferenceFields } from './countryPreferenceData'
import { computeResidencyEaseScore, residencyVisaAvailable } from './residencyEase'
import { getQualityOfLifeData } from './qualityOfLife'
import type { DailyLifeFactorId } from '../types/preferences'

const INDEX_FALLBACK = 50

export type DailyLifeScoreContext = {
  monthlyIncome?: number
}

const EXPAT_TIER_SCORES: Record<ReturnType<typeof expatCommunityPinTier>, number> = {
  enormous: 95,
  'very-large': 85,
  large: 75,
  moderate: 55,
  small: 35,
  domestic: 72,
  none: 25,
}

function languageCurveScore(country: string): number {
  const fields = getCountryPreferenceFields(country)
  const difficulty = fields.language_difficulty
  if (ENGLISH_OFFICIAL.has(country.trim())) return 100
  switch (difficulty) {
    case 'easy':
      return 85
    case 'moderate':
      return 60
    case 'hard':
      return 30
    case 'very_hard':
      return 15
    default:
      return INDEX_FALLBACK
  }
}

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
])

function distanceFromUsScore(country: string): number {
  const hours = getCountryPreferenceFields(country).flight_hours_from_us ?? 12
  if (hours < 4) return 100
  if (hours < 8) return 75
  if (hours < 12) return 50
  if (hours < 16) return 25
  return 10
}

function internetScore(country: string): number {
  const mbps = getCountryPreferenceFields(country).avg_broadband_mbps ?? 50
  if (mbps > 100) return 100
  if (mbps >= 50) return 80
  if (mbps >= 20) return 60
  if (mbps >= 5) return 35
  return 10
}

function foodCultureScore(country: string): number {
  const qol = getQualityOfLifeData(country)
  if (qol?.quality_of_life_index != null) {
    return Math.max(0, Math.min(100, Math.round((qol.quality_of_life_index / 220) * 100)))
  }
  return INDEX_FALLBACK
}

function publicTransportScore(country: string): number {
  const qol = getQualityOfLifeData(country)
  if (!qol) return 40
  if (qol.traffic_commute_index != null && qol.traffic_commute_index < 120) return 80
  return 40
}

export function dailyLifeFactorScore(
  factor: DailyLifeFactorId,
  country: string,
  context: DailyLifeScoreContext = {},
): number {
  switch (factor) {
    case 'english':
      return englishFriendlinessScoreForCountry(country)
    case 'expat':
      return EXPAT_TIER_SCORES[expatCommunityPinTier(country)]
    case 'residency':
      return computeResidencyEaseScore(country, { monthlyIncome: context.monthlyIncome })
    case 'walkability':
      return INDEX_FALLBACK
    case 'publicTransport':
      return publicTransportScore(country)
    case 'internet':
      return internetScore(country)
    case 'food':
      return foodCultureScore(country)
    case 'distanceFromUS':
      return distanceFromUsScore(country)
    case 'languageCurve':
      return languageCurveScore(country)
    default:
      return INDEX_FALLBACK
  }
}

export function residencyVisaStatus(country: string): 'has_retirement_visa' | 'no_retirement_visa' {
  return residencyVisaAvailable(country) ? 'has_retirement_visa' : 'no_retirement_visa'
}
