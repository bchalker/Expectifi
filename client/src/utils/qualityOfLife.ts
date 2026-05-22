import qualityOfLifeCombined from '../data/quality-of-life.json'

export type QualityOfLifeSource = 'numbeo_2024' | 'world_bank_proxy'

export type QualityOfLifeCountryData = {
  quality_of_life_index: number
  purchasing_power_index: number
  safety_index: number
  healthcare_index: number
  pollution_index: number
  climate_index: number
  traffic_commute_index: number
  source: QualityOfLifeSource
  /** Present on Numbeo rows; omitted on some World Bank proxy rows. */
  cost_of_living_index?: number
  property_price_to_income_ratio?: number
}

type QualityOfLifeCombinedFile = {
  metadata: {
    last_updated: string
    total_countries: number
    numbeo_countries: number
    world_bank_proxy_countries: number
    disclaimer: string
  }
  countries: Record<string, QualityOfLifeCountryData>
}

const combined = qualityOfLifeCombined as unknown as QualityOfLifeCombinedFile
const dataset = combined.countries

/** Raw overall index ceiling (pre-normalization). */
export const QOL_OVERALL_MAX = 220

/** Display scale for overall QoL (matches retirement score breakdown). */
export const QOL_NORMALIZED_MAX = 100

export const QOL_UNAVAILABLE_MESSAGE =
  'Quality of life data not yet available for this country.'

export const QOL_WORLD_BANK_PROXY_NOTE =
  'Estimated from World Bank indicators — limited Numbeo data available for this country'

export const QOL_TAB_SOURCE_FOOTER =
  'Sources: Numbeo Quality of Life Index 2024 and World Bank proxy indicators where Numbeo data is unavailable. Scores normalized to 0-100 scale. Country-level data — city conditions may vary.'

/** Map raw overall index (0–220) to 0–100 for display and retirement scoring. */
export function qolNormalizedFromIndex(index: number): number {
  return Math.min(QOL_NORMALIZED_MAX, Math.round((index / QOL_OVERALL_MAX) * QOL_NORMALIZED_MAX))
}

/** Country-level quality of life (keys match `city.country`, e.g. "Portugal"). */
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

export type QoLOverallBand = 'excellent' | 'moderate' | 'below-average'

export type QoLMetricBand = 'good' | 'mid' | 'bad'

export type QoLMetricKey =
  | 'safety'
  | 'healthcare'
  | 'climate'
  | 'pollution'
  | 'purchasing'
  | 'traffic'

/** Overall index bands on normalized 0–100 scale (same thresholds as former 154 / 99 on 220). */
export function qolOverallScoreBand(rawIndex: number): { band: QoLOverallBand; label: string } {
  const normalized = qolNormalizedFromIndex(rawIndex)
  if (normalized >= 70) return { band: 'excellent', label: 'Excellent' }
  if (normalized >= 45) return { band: 'moderate', label: 'Moderate' }
  return { band: 'below-average', label: 'Below average' }
}

/** Bar color band for sub-metrics (good = green, mid = amber, bad = red). */
export function qolMetricBarBand(score: number, metric: QoLMetricKey): QoLMetricBand {
  switch (metric) {
    case 'safety':
    case 'healthcare':
      if (score >= 75) return 'good'
      if (score >= 55) return 'mid'
      return 'bad'
    case 'climate':
      if (score >= 80) return 'good'
      if (score >= 60) return 'mid'
      return 'bad'
    case 'purchasing':
      if (score >= 80) return 'good'
      if (score >= 50) return 'mid'
      return 'bad'
    case 'pollution':
      if (score < 25) return 'good'
      if (score < 50) return 'mid'
      return 'bad'
    case 'traffic':
      if (score < 20) return 'good'
      if (score < 36) return 'mid'
      return 'bad'
    default:
      return 'mid'
  }
}

export function formatQoLIndex(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

/** Comparison table display for Quality of Life rows. */
export function getQoLRowValue(data: QualityOfLifeCountryData | null, rowId: string): string {
  if (!data) return '—'
  switch (rowId) {
    case 'qolOverall':
      return `${formatQoLIndex(qolNormalizedFromIndex(data.quality_of_life_index))} / ${QOL_NORMALIZED_MAX}`
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
      return qolNormalizedFromIndex(data.quality_of_life_index)
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
