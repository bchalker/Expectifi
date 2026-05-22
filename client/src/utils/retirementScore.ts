import { getQualityOfLifeData, type QualityOfLifeCountryData } from './qualityOfLife'

export type RetirementScoreBand = 'excellent' | 'strong' | 'good' | 'moderate' | 'poor'

const QOL_INDEX_MAX = 220

/** Normalized QoL used when country has no combined-dataset row. */
export const QOL_FALLBACK_NORMALIZED = 59

export type RetirementScoreResult = {
  rawRetirementScore: number
  retirementScore: number
  displayScore: number
  incomeFitScore: number
  qolNormalized: number
  band: RetirementScoreBand
  bandColor: string
  bandLabel: string
  warnings: string[]
}

function getRetirementScoreBand(score: number): {
  band: RetirementScoreBand
  label: string
  color: string
} {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (s >= 85) return { band: 'excellent', label: 'Excellent fit', color: '#22c55e' }
  if (s >= 70) return { band: 'strong', label: 'Strong fit', color: '#0d9488' }
  if (s >= 55) return { band: 'good', label: 'Good fit', color: '#f59e0b' }
  if (s >= 40) return { band: 'moderate', label: 'Moderate fit', color: '#f97316' }
  return { band: 'poor', label: 'Poor fit', color: '#ef4444' }
}

export function retirementScoreBandFromScore(score: number): Pick<
  RetirementScoreResult,
  'band' | 'bandColor' | 'bandLabel'
> {
  const { band, label, color } = getRetirementScoreBand(score)
  return { band, bandLabel: label, bandColor: color }
}

export function qolIndexForCountry(country: string): number | null {
  const data = getQualityOfLifeData(country)
  return data?.quality_of_life_index ?? null
}

export function calculateRetirementScore(
  monthlyIncome: number,
  monthlyBudget: number,
  _qolIndex: number | null,
  country?: string | null,
): RetirementScoreResult {
  const qolData: QualityOfLifeCountryData | null = country?.trim()
    ? getQualityOfLifeData(country.trim())
    : null

  const incomeFitScore =
    monthlyBudget <= 0 || monthlyIncome <= 0
      ? 0
      : Math.min(100, Math.round((monthlyIncome / monthlyBudget) * 60))

  const qolNormalized = qolData
    ? Math.round((qolData.quality_of_life_index / QOL_INDEX_MAX) * 100)
    : QOL_FALLBACK_NORMALIZED

  const rawScore = Math.round(incomeFitScore * 0.65 + qolNormalized * 0.35)

  let cappedScore = rawScore
  const warnings: string[] = []

  if (qolData?.pollution_index != null && qolData.pollution_index > 70) {
    cappedScore = Math.min(cappedScore, 69)
    warnings.push('⚠ High pollution reported')
  }
  if (qolData?.safety_index != null && qolData.safety_index < 35) {
    cappedScore = Math.min(cappedScore, 54)
    warnings.push('⚠ High crime rates reported')
  }
  if (qolData?.healthcare_index != null && qolData.healthcare_index < 35) {
    cappedScore = Math.min(cappedScore, 69)
    warnings.push('⚠ Limited healthcare access')
  }

  cappedScore = Math.max(0, Math.min(100, Math.round(cappedScore)))

  const { band, label, color } = getRetirementScoreBand(cappedScore)

  return {
    rawRetirementScore: rawScore,
    retirementScore: cappedScore,
    displayScore: cappedScore,
    incomeFitScore,
    qolNormalized,
    band,
    bandColor: color,
    bandLabel: label,
    warnings,
  }
}
