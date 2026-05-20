import qualityOfLifeDataset from '../data/quality-of-life.json'

export type QualityOfLifeCountryData = {
  quality_of_life_index: number
  purchasing_power_index: number
  safety_index: number
  healthcare_index: number
  cost_of_living_index: number
  property_price_to_income_ratio: number
  traffic_commute_index: number
  pollution_index: number
  climate_index: number
}

type QualityOfLifeDataset = Record<string, QualityOfLifeCountryData>

const dataset = qualityOfLifeDataset as QualityOfLifeDataset

export const QOL_OVERALL_MAX = 220

export const QOL_UNAVAILABLE_MESSAGE =
  'Quality of life data not yet available for this country.'

export const QOL_TAB_SOURCE_FOOTER =
  'Source: Numbeo Quality of Life Index 2024. Scores are crowdsourced estimates. Country-level data — city conditions may vary.'

/** Numbeo country-level quality of life metrics (keys match `city.country`, e.g. "Portugal"). */
export function getQualityOfLifeData(country: string): QualityOfLifeCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset[trimmed] ?? null
}

export function interpretSafety(score: number): string {
  if (score >= 75) return 'Very safe'
  if (score >= 55) return 'Reasonably safe'
  if (score >= 40) return 'Exercise caution'
  return 'High crime rates reported'
}

export function interpretHealthcare(score: number): string {
  if (score >= 75) return 'World-class healthcare'
  if (score >= 55) return 'Good quality care available'
  if (score >= 40) return 'Basic care available, private recommended'
  return 'Limited healthcare, insurance essential'
}

export function interpretClimate(score: number): string {
  if (score >= 80) return 'Excellent climate'
  if (score >= 60) return 'Pleasant climate'
  if (score >= 40) return 'Variable climate'
  return 'Challenging climate'
}

export function interpretPollution(score: number): string {
  if (score < 25) return 'Very clean air and environment'
  if (score < 50) return 'Moderate pollution levels'
  if (score < 75) return 'Notable pollution — check local conditions'
  return 'High pollution reported'
}

export function interpretPurchasingPower(score: number): string {
  if (score >= 80) return 'Strong purchasing power'
  if (score >= 50) return 'Moderate purchasing power'
  if (score >= 30) return 'Limited purchasing power vs US'
  return 'Low purchasing power'
}

export function interpretTraffic(score: number): string {
  if (score < 20) return 'Very low traffic, easy commutes'
  if (score < 36) return 'Moderate traffic'
  if (score <= 50) return 'Heavy traffic in peak hours'
  return 'Severe traffic congestion'
}

/** 0–100 bar fill; lower raw score = fuller bar when inverted. */
export function qolBarFillPercent(score: number, invert = false): number {
  const clamped = Math.min(100, Math.max(0, score))
  return invert ? 100 - clamped : clamped
}

export function formatQoLIndex(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

/** Comparison table display for Quality of Life rows. */
export function getQoLRowValue(data: QualityOfLifeCountryData | null, rowId: string): string {
  if (!data) return '—'
  switch (rowId) {
    case 'qolOverall':
      return `${formatQoLIndex(data.quality_of_life_index)} / ${QOL_OVERALL_MAX}`
    case 'qolSafety':
      return formatQoLIndex(data.safety_index)
    case 'qolHealthcare':
      return formatQoLIndex(data.healthcare_index)
    case 'qolClimate':
      return formatQoLIndex(data.climate_index)
    case 'qolPollution':
      return formatQoLIndex(data.pollution_index)
    case 'qolPurchasingPower':
      return formatQoLIndex(data.purchasing_power_index)
    default:
      return '—'
  }
}

export function getQoLRowNumericValue(
  data: QualityOfLifeCountryData | null,
  rowId: string,
): number | null {
  if (!data) return null
  switch (rowId) {
    case 'qolOverall':
      return data.quality_of_life_index
    case 'qolSafety':
      return data.safety_index
    case 'qolHealthcare':
      return data.healthcare_index
    case 'qolClimate':
      return data.climate_index
    case 'qolPollution':
      return data.pollution_index
    case 'qolPurchasingPower':
      return data.purchasing_power_index
    default:
      return null
  }
}
