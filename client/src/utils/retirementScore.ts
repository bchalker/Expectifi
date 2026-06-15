import {
  computeClimateDirectionScore,
  computeClimateTemperatureRangeScore,
  extractClimateMetrics,
} from './climateDirectionScore'
import type { CityClimate } from '../lib/api/openMeteo'
import type { CityData } from './costOfLiving'
import {
  computeDisasterRiskScore,
  computeHealthcareCostScore,
  computePoliticalStabilityScore,
  computeSocialLawsScore,
  getCountryPreferenceFields,
} from './countryPreferenceData'
import {
  DEFAULT_PREFERENCES,
  isClimateTempRangeUnset,
  preferenceWeight,
  type PreferenceStep,
  type RetirementPreferences,
} from '../types/preferences'
import { dailyLifeFactorScore } from './dailyLifeFactorScores'
import { getQualityOfLifeData, type QualityOfLifeCountryData } from './qualityOfLife'
import { resolveRetirementTaxScoreComponents } from './retirementScoreTax'

export type RetirementScoreBand = 'excellent' | 'good' | 'moderate' | 'poor'

export type ScoreDetailBand =
  | 'exceptional'
  | 'excellent'
  | 'good'
  | 'moderate'
  | 'challenging'
  | 'poor'

export const QOL_FALLBACK_NORMALIZED = 59

const QOL_INDEX_MAX = 220
const INDEX_FALLBACK_SCORE = 50

const PIN_BAND_THRESHOLDS = {
  excellent: 90,
  good: 70,
  moderate: 50,
} as const

const PIN_BAND_COLORS: Record<RetirementScoreBand, string> = {
  excellent: '#1E8E47',
  good: '#27b95d',
  moderate: '#f1a841',
  poor: '#BF3A2B',
}

const FLAT_TERRITORIAL_COUNTRIES = new Set([
  'Italy',
  'Portugal',
  'Panama',
  'Paraguay',
  'Georgia',
])

export type RetirementScoreResult = {
  rawRetirementScore: number
  retirementScore: number
  displayScore: number
  incomeFitScore: number
  qolNormalized: number
  safetyScore: number
  healthcareScore: number
  taxScore: number
  climateScore: number
  estimatedTaxRate: number
  band: RetirementScoreBand
  bandColor: string
  bandLabel: string
  warnings: string[]
}

export type RetirementScoreOptions = {
  prefs?: RetirementPreferences
  climate?: CityClimate | null
}

function getPinScoreBand(score: number): {
  band: RetirementScoreBand
  label: string
  color: string
} {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (s >= PIN_BAND_THRESHOLDS.excellent) {
    return { band: 'excellent', label: 'Excellent', color: PIN_BAND_COLORS.excellent }
  }
  if (s >= PIN_BAND_THRESHOLDS.good) {
    return { band: 'good', label: 'Good', color: PIN_BAND_COLORS.good }
  }
  if (s >= PIN_BAND_THRESHOLDS.moderate) {
    return { band: 'moderate', label: 'Moderate', color: PIN_BAND_COLORS.moderate }
  }
  return { band: 'poor', label: 'Poor', color: PIN_BAND_COLORS.poor }
}

export function scorePinBandFromScore(score: number): {
  band: RetirementScoreBand
  label: string
  color: string
} {
  return getPinScoreBand(score)
}

function getDetailScoreBand(score: number): {
  band: ScoreDetailBand
  label: string
} {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (s >= 90) return { band: 'exceptional', label: 'Exceptional' }
  if (s >= 80) return { band: 'excellent', label: 'Excellent' }
  if (s >= 70) return { band: 'good', label: 'Good' }
  if (s >= 55) return { band: 'moderate', label: 'Moderate' }
  if (s >= 40) return { band: 'challenging', label: 'Challenging' }
  return { band: 'poor', label: 'Poor fit' }
}

export function scoreDetailBandFromScore(score: number): {
  band: ScoreDetailBand
  label: string
} {
  return getDetailScoreBand(score)
}

export function retirementScoreBandFromScore(score: number): Pick<
  RetirementScoreResult,
  'band' | 'bandColor' | 'bandLabel'
> {
  const { band, label, color } = getPinScoreBand(score)
  return { band, bandLabel: label, bandColor: color }
}

function normalizeIndexScore(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return INDEX_FALLBACK_SCORE
  return Math.max(0, Math.min(100, Math.round(value)))
}

function incomeTaxHaircut(country: string, estimatedTaxRate: number): number {
  if (FLAT_TERRITORIAL_COUNTRIES.has(country.trim())) return 0.07
  const pct = estimatedTaxRate * 100
  if (pct > 40) return 0.35
  if (pct > 30) return 0.28
  if (pct > 20) return 0.2
  return 0.12
}

function computeClimateScore(
  climateStep: PreferenceStep,
  climateTempMinF: number,
  climateTempMaxF: number,
  climatePreference: RetirementPreferences['climatePreference'],
  climate: CityClimate | null | undefined,
): number {
  if (climateStep === 0) return 50
  if (!climate?.monthly?.length) return INDEX_FALLBACK_SCORE

  if (!isClimateTempRangeUnset(climateTempMinF, climateTempMaxF)) {
    return computeClimateTemperatureRangeScore(climate, climateTempMinF, climateTempMaxF)
  }

  if (climatePreference !== 'none') {
    return computeClimateDirectionScore(climate, climatePreference)
  }

  return 50
}

function buildWeightedScore(factorScores: { score: number; weight: number }[]): number {
  let factors = factorScores
  let totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)

  if (totalWeight === 0) {
    const fallback = DEFAULT_PREFERENCES
    factors = [
      { score: factors[0]?.score ?? 50, weight: preferenceWeight(fallback.affordability) },
      { score: factors[1]?.score ?? 50, weight: preferenceWeight(fallback.taxEfficiency) },
      { score: factors[2]?.score ?? 50, weight: preferenceWeight(fallback.healthcareCost) },
      { score: factors[3]?.score ?? 50, weight: preferenceWeight(fallback.safety) },
      { score: factors[4]?.score ?? 50, weight: preferenceWeight(fallback.healthcareQuality) },
      { score: factors[5]?.score ?? 50, weight: preferenceWeight(fallback.airQuality) },
      { score: factors[6]?.score ?? 50, weight: preferenceWeight(fallback.disasterRisk) },
      { score: factors[7]?.score ?? 50, weight: preferenceWeight(fallback.climate) },
      { score: factors[8]?.score ?? 50, weight: preferenceWeight(fallback.politicalStability) },
      { score: factors[9]?.score ?? 50, weight: preferenceWeight(fallback.socialLaws) },
      ...factors.slice(10),
    ]
    totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
  }

  if (totalWeight <= 0) return 50

  return factors.reduce((sum, f) => sum + f.score * (f.weight / totalWeight), 0)
}

function applyHardCaps(
  score: number,
  prefs: RetirementPreferences,
  qolData: QualityOfLifeCountryData | null,
  safetyScore: number,
  healthcareQualityScore: number,
  socialLawsScore: number,
  disasterScore: number,
  monthlyIncome: number,
  country: string,
  climateScore: number,
  climate: CityClimate | null | undefined,
): { score: number; warnings: string[] } {
  let capped = score
  const warnings: string[] = []
  const fields = getCountryPreferenceFields(country)

  if (prefs.safety >= 10 && safetyScore < 35) {
    capped = Math.min(capped, 44)
    warnings.push('⚠ Safety below your non-negotiable threshold')
  } else if (prefs.safety >= 8 && safetyScore < 35) {
    capped = Math.min(capped, 54)
    warnings.push('⚠ High crime rates reported')
  }

  if (prefs.healthcareQuality >= 10 && healthcareQualityScore < 35) {
    capped = Math.min(capped, 44)
    warnings.push('⚠ Healthcare below your non-negotiable threshold')
  }

  if (prefs.airQuality >= 10 && qolData?.pollution_index != null && qolData.pollution_index > 80) {
    capped = Math.min(capped, 59)
    warnings.push('⚠ Air quality below your non-negotiable threshold')
  }

  if (prefs.socialLaws >= 10 && socialLawsScore < 30) {
    capped = Math.min(capped, 44)
    warnings.push('⚠ Social laws conflict with your non-negotiable preferences')
  }

  if (prefs.disasterRisk >= 10 && disasterScore < 25) {
    capped = Math.min(capped, 54)
    warnings.push('⚠ Natural disaster risk above your threshold')
  }

  if (prefs.healthcareCost >= 10) {
    const annualInsurance = fields.estimated_expat_insurance_usd ?? 3000
    const pct = monthlyIncome > 0 ? (annualInsurance / 12 / monthlyIncome) * 100 : 0
    if (pct > 15) {
      capped = Math.min(capped, 59)
      warnings.push('⚠ Healthcare insurance cost exceeds your budget threshold')
    }
  }

  if (climate?.monthly?.length && prefs.climate >= 8) {
    const metrics = extractClimateMetrics(climate)
    const usesTempRange = !isClimateTempRangeUnset(prefs.climateTempMinF, prefs.climateTempMaxF)

    if (
      !usesTempRange &&
      prefs.climatePreference === 'warm_dry' &&
      metrics.avgHumidityPct != null &&
      metrics.avgHumidityPct > 80
    ) {
      capped = Math.min(capped, 74)
      warnings.push('⚠ Tropical humidity conflicts with your warm & dry preference')
    }

    if (
      !usesTempRange &&
      prefs.climatePreference === 'four_seasons' &&
      metrics.minMonthlyAvgC > 18
    ) {
      capped = Math.min(capped, 69)
      warnings.push('⚠ Tropical climate conflicts with your four seasons preference')
    }
  }

  if (qolData?.pollution_index != null && qolData.pollution_index > 70) {
    capped = Math.min(capped, 69)
    warnings.push('⚠ High pollution reported')
  }

  if (prefs.climate >= 10 && climateScore < 35) {
    capped = Math.min(capped, 44)
    warnings.push('⚠ Climate comfort below your non-negotiable threshold')
  }

  return { score: Math.max(0, Math.min(100, Math.round(capped))), warnings }
}

export function calculateRetirementScore(
  monthlyIncome: number,
  monthlyBudget: number,
  cityData: CityData,
  country?: string | null,
  prefs: RetirementPreferences = DEFAULT_PREFERENCES,
  options: RetirementScoreOptions = {},
): RetirementScoreResult {
  const resolvedCountry = country?.trim() || cityData.country?.trim() || ''
  const resolvedPrefs = prefs ?? DEFAULT_PREFERENCES
  const climate = options.climate

  const qolData: QualityOfLifeCountryData | null = resolvedCountry
    ? getQualityOfLifeData(resolvedCountry)
    : null

  const { taxScore, estimatedTaxRate } = resolveRetirementTaxScoreComponents(resolvedCountry)
  const haircut = incomeTaxHaircut(resolvedCountry, estimatedTaxRate)
  const effectiveIncome = monthlyIncome * (1 - haircut)

  const incomeFitScore =
    monthlyBudget <= 0 || effectiveIncome <= 0
      ? 0
      : Math.min(100, Math.round((effectiveIncome / monthlyBudget) * 50))

  const qolNormalized = qolData
    ? Math.round((qolData.quality_of_life_index / QOL_INDEX_MAX) * 100)
    : QOL_FALLBACK_NORMALIZED

  const safetyScore = normalizeIndexScore(qolData?.safety_index)
  const healthcareQualityScore = normalizeIndexScore(qolData?.healthcare_index)
  const airQualityScore =
    qolData?.pollution_index != null
      ? Math.max(0, 100 - Math.round(qolData.pollution_index))
      : INDEX_FALLBACK_SCORE
  const disasterScore = computeDisasterRiskScore(resolvedCountry)
  const healthcareCostScore = computeHealthcareCostScore(resolvedCountry, monthlyIncome)
  const climateScore = computeClimateScore(
    resolvedPrefs.climate,
    resolvedPrefs.climateTempMinF,
    resolvedPrefs.climateTempMaxF,
    resolvedPrefs.climatePreference,
    climate,
  )
  const politicalStabilityScore = computePoliticalStabilityScore(resolvedCountry)
  const socialLawsScore = computeSocialLawsScore(resolvedCountry)

  const dailyLifeScores = Object.fromEntries(
    resolvedPrefs.dailyLife.map((entry) => [
      entry.factor,
      dailyLifeFactorScore(entry.factor, resolvedCountry, { monthlyIncome }),
    ]),
  ) as Record<string, number>

  const factors = [
    { score: incomeFitScore, weight: preferenceWeight(resolvedPrefs.affordability) },
    { score: taxScore, weight: preferenceWeight(resolvedPrefs.taxEfficiency) },
    { score: healthcareCostScore, weight: preferenceWeight(resolvedPrefs.healthcareCost) },
    { score: safetyScore, weight: preferenceWeight(resolvedPrefs.safety) },
    { score: healthcareQualityScore, weight: preferenceWeight(resolvedPrefs.healthcareQuality) },
    { score: airQualityScore, weight: preferenceWeight(resolvedPrefs.airQuality) },
    { score: disasterScore, weight: preferenceWeight(resolvedPrefs.disasterRisk) },
    { score: climateScore, weight: preferenceWeight(resolvedPrefs.climate) },
    { score: politicalStabilityScore, weight: preferenceWeight(resolvedPrefs.politicalStability) },
    { score: socialLawsScore, weight: preferenceWeight(resolvedPrefs.socialLaws) },
    ...resolvedPrefs.dailyLife.map((entry) => ({
      score: dailyLifeScores[entry.factor] ?? INDEX_FALLBACK_SCORE,
      weight: preferenceWeight(entry.step),
    })),
  ]

  const rawScore = Math.round(buildWeightedScore(factors))
  const { score: cappedScore, warnings } = applyHardCaps(
    rawScore,
    resolvedPrefs,
    qolData,
    safetyScore,
    healthcareQualityScore,
    socialLawsScore,
    disasterScore,
    monthlyIncome,
    resolvedCountry,
    climateScore,
    climate,
  )

  const { band, label, color } = getPinScoreBand(cappedScore)

  return {
    rawRetirementScore: rawScore,
    retirementScore: cappedScore,
    displayScore: cappedScore,
    incomeFitScore,
    qolNormalized,
    safetyScore,
    healthcareScore: healthcareQualityScore,
    taxScore,
    climateScore,
    estimatedTaxRate,
    band,
    bandColor: color,
    bandLabel: label,
    warnings,
  }
}
