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

/** `metadata.last_updated` from quality-of-life.json (`YYYY-MM`). */
export function getQualityOfLifeLastUpdated(): string {
  return combined.metadata.last_updated
}

/** Raw overall index ceiling (pre-normalization). */
export const QOL_OVERALL_MAX = 220

/** Display scale for overall QoL (matches retirement score breakdown). */
export const QOL_NORMALIZED_MAX = 100

export const QOL_UNAVAILABLE_MESSAGE =
  'Quality of life data not yet available for this country.'

export const QOL_COUNTRY_SCOPE_LABEL = 'Country-level'

/** Country key for the US QoL baseline (Numbeo-sourced). */
export const US_QOL_BASELINE_COUNTRY = 'United States'

export const QOL_WORLD_BANK_PROXY_NOTE =
  'Country-level · World Bank proxy indicators 2024 — Numbeo data unavailable for this country.'

export function formatQoLSourceDataset(source: QualityOfLifeSource): string {
  return source === 'numbeo_2024'
    ? 'Numbeo Quality of Life Index 2024'
    : 'World Bank proxy indicators 2024'
}

/** Page footer for the QoL tab — scope and datasets stated once, not repeated per field. */
export function getQoLTabSourceFooter(source: QualityOfLifeSource): string {
  const dataset = formatQoLSourceDataset(source)
  return [
    `${QOL_COUNTRY_SCOPE_LABEL} scores — city conditions may vary.`,
    `Overall quality, safety, healthcare, climate, air quality, purchasing, and traffic: ${dataset}.`,
    'Insurance cost is a rough premium estimate, not from Numbeo or World Bank.',
    'Index scores normalized to 0–100 for display.',
  ].join(' ')
}

/** @deprecated Use getQoLTabSourceFooter(source) */
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

/** US Numbeo QoL row — shared baseline for summary-card comparisons. */
export function getUsQualityOfLifeData(): QualityOfLifeCountryData | null {
  return getQualityOfLifeData(US_QOL_BASELINE_COUNTRY)
}

/** Normalized 0–100 US overall QoL (Numbeo). Returns null if US row is missing. */
export function getUsQoLNormalizedBenchmark(): number | null {
  const us = getUsQualityOfLifeData()
  if (!us) return null
  return qolNormalizedFromIndex(us.quality_of_life_index)
}

/** US baseline marker is valid only when destination uses the same Numbeo source. */
export function isQoLUsBaselineComparable(
  source: QualityOfLifeSource | undefined,
): boolean {
  return source === 'numbeo_2024'
}

export function interpretSafety(score: number): string {
  if (score >= 75) return 'Very safe'
  if (score >= 55) return 'Reasonably safe'
  if (score >= 40) return 'Exercise caution'
  return 'High crime rates reported'
}

export type HealthcareBand = 'limited' | 'basic' | 'good' | 'world-class'

export type QoLMetricKey =
  | 'overall'
  | 'safety'
  | 'healthcare'
  | 'climate'
  | 'pollution'
  | 'purchasing'
  | 'traffic'

export type QoLMetricBandTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4'

/** One band on the equal-width meter (worst → best, left → right). */
export type QoLScoreBand = {
  min: number
  max: number
  label: string
  tier: QoLMetricBandTier
}

export type QoLMetricBandConfig = {
  bands: QoLScoreBand[]
}

/** Equal visual quartiles — marker position and bold label must use the same ranges. */
export const QOL_SCORE_BAND_RANGES: readonly { min: number; max: number }[] = [
  { min: 0, max: 24 },
  { min: 25, max: 49 },
  { min: 50, max: 74 },
  { min: 75, max: 100 },
] as const

const QOL_BAND_TIER_ORDER: QoLMetricBandTier[] = [
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
]

const QOL_BAND_TIER_TO_VISUAL: Record<QoLMetricBandTier, HealthcareBand> = {
  'tier-1': 'limited',
  'tier-2': 'basic',
  'tier-3': 'good',
  'tier-4': 'world-class',
}

function buildQoLMetricBands(
  labels: [string, string, string, string],
): QoLScoreBand[] {
  return labels.map((label, index) => ({
    label,
    tier: QOL_BAND_TIER_ORDER[index]!,
    min: QOL_SCORE_BAND_RANGES[index]!.min,
    max: QOL_SCORE_BAND_RANGES[index]!.max,
  }))
}

/** Per-factor band labels (worst → best). Threshold ranges are shared quartiles above. */
export const QOL_METRIC_BAND_CONFIGS: Record<QoLMetricKey, QoLMetricBandConfig> = {
  overall: {
    bands: buildQoLMetricBands(['Below average', 'Fair', 'Moderate', 'Excellent']),
  },
  healthcare: {
    bands: buildQoLMetricBands(['Limited', 'Basic', 'Good', 'World-class']),
  },
  safety: {
    bands: buildQoLMetricBands(['High risk', 'Caution', 'Reasonable', 'Very safe']),
  },
  climate: {
    bands: buildQoLMetricBands(['Challenging', 'Variable', 'Pleasant', 'Excellent']),
  },
  pollution: {
    bands: buildQoLMetricBands(['High pollution', 'Notable', 'Moderate', 'Very clean']),
  },
  purchasing: {
    bands: buildQoLMetricBands(['Low', 'Limited', 'Moderate', 'Strong']),
  },
  traffic: {
    bands: buildQoLMetricBands(['Severe', 'Heavy', 'Moderate', 'Very low']),
  },
}

export function clampQoLScore(score: number): number {
  return Math.min(100, Math.max(0, score))
}

/** Whole-number score for display, band lookup, and marker position. */
export function roundQoLDisplayScore(score: number): number {
  return Math.round(clampQoLScore(score))
}

export function formatQoLDisplayScore(score: number): string {
  return `${roundQoLDisplayScore(score)}`
}

/** Shared band lookup — score + ordered {min, max, label} bands → active band. */
export function resolveQoLScoreBand(score: number, bands: QoLScoreBand[]): QoLScoreBand {
  const clamped = roundQoLDisplayScore(score)
  const match = bands.find((band) => clamped >= band.min && clamped <= band.max)
  if (!match) {
    throw new Error(`No QoL band for score ${clamped}`)
  }
  return match
}

export function qolBandTierToVisualClass(tier: QoLMetricBandTier): HealthcareBand {
  return QOL_BAND_TIER_TO_VISUAL[tier]
}

export function resolveQoLMetricBand(
  metric: QoLMetricKey,
  score: number,
): {
  tier: QoLMetricBandTier
  label: string
  visualClass: HealthcareBand
  bandIndex: number
} {
  const { bands } = QOL_METRIC_BAND_CONFIGS[metric]
  const match = resolveQoLScoreBand(score, bands)
  const bandIndex = bands.indexOf(match)
  return {
    tier: match.tier,
    label: match.label,
    visualClass: qolBandTierToVisualClass(match.tier),
    bandIndex,
  }
}

/** Marker position on the 0–100 track (same scale as band quartiles). */
export function qolMetricMarkerPercent(_metric: QoLMetricKey, score: number): number {
  return roundQoLDisplayScore(score)
}

export function qolMetricBandSegments(metric: QoLMetricKey): {
  band: HealthcareBand
  label: string
  bandIndex: number
}[] {
  return QOL_METRIC_BAND_CONFIGS[metric].bands.map((band, bandIndex) => ({
    band: qolBandTierToVisualClass(band.tier),
    label: band.label,
    bandIndex,
  }))
}

/** @deprecated Use qolMetricBandSegments('healthcare') */
export const HEALTHCARE_BAND_SEGMENTS = qolMetricBandSegments('healthcare')

export function healthcareBand(score: number): { band: HealthcareBand; label: string } {
  const resolved = resolveQoLMetricBand('healthcare', score)
  return { band: resolved.visualClass, label: resolved.label }
}

export function interpretHealthcare(score: number): string {
  if (score >= 75) return 'World-class healthcare'
  if (score >= 55) return 'Good quality care available'
  if (score >= 40) return 'Basic care available, private recommended'
  return 'Limited healthcare, insurance essential'
}

/** Score-band guidance for the QoL healthcare card (v1 — templated only). */
export function healthcareBandDescription(score: number): string {
  if (score >= 75) {
    return "You're looking at care that rivals what you'd expect in the US or Western Europe — important if you have ongoing conditions and want to avoid medevac trips home."
  }
  if (score >= 55) {
    return "Solid hospitals and specialists in cities; you'll want private insurance and a clear plan for which city you'd use for serious care."
  }
  if (score >= 40) {
    return 'Routine care is workable, but research which private hospitals expats use and keep insurance comprehensive for anything complex.'
  }
  return "Treat international insurance as non-negotiable and know where you'd go for emergencies — this score is a flag to dig deeper, not a green light."
}

/** @deprecated Use formatQoLSourceDataset */
export function formatHealthcareSourceLabel(source: QualityOfLifeSource): string {
  return formatQoLSourceDataset(source)
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

/** Map 3-tier overall badge to 4-tier meter/card palette. */
export function qolOverallBandToVisual(band: QoLOverallBand): HealthcareBand {
  if (band === 'excellent') return 'world-class'
  if (band === 'moderate') return 'basic'
  return 'limited'
}

export type QoLMetricBand = 'good' | 'mid' | 'bad'

/** Shared 3-tier color for the overall score gradient bar. */
export function qolOverallBarTone(rawIndex: number): QoLOverallBand {
  return qolOverallScoreBand(rawIndex).band
}

/** Overall index bands on normalized 0–100 scale (same thresholds as former 154 / 99 on 220). */
export function qolOverallScoreBand(rawIndex: number): { band: QoLOverallBand; label: string } {
  const normalized = qolNormalizedFromIndex(rawIndex)
  if (normalized >= 70) return { band: 'excellent', label: 'Excellent' }
  if (normalized >= 45) return { band: 'moderate', label: 'Moderate' }
  return { band: 'below-average', label: 'Below average' }
}

/** Maps a sub-metric band to a coarse 3-tone fill (legacy flat bars). */
export function qolMetricBarBand(score: number, metric: QoLMetricKey): QoLMetricBand {
  const { visualClass } = resolveQoLMetricBand(metric, score)
  if (visualClass === 'world-class' || visualClass === 'good') return 'good'
  if (visualClass === 'basic') return 'mid'
  return 'bad'
}

export function formatQoLIndex(value: number): string {
  return formatQoLDisplayScore(value)
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
