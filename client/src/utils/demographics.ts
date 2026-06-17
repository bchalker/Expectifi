import demographicsDataset from '../data/demographics.json'

export type ReligionKey =
  | 'Christian'
  | 'Muslim'
  | 'Buddhist'
  | 'Hindu'
  | 'Jewish'
  | 'Unaffiliated'
  | 'Other'

export type ReligionBreakdown = Partial<Record<ReligionKey, number>>

export type DemographicsCountryData = {
  religion: {
    dominant: string
    breakdown: ReligionBreakdown
    christian_note: string
    expat_worship: string
    expat_worship_why?: string
  }
  demographics: {
    population: string
    median_age: number
    urban_pct: number
    english_proficiency: string
    expat_population: string
    official_language: string
    common_languages: string
    expat_population_why?: string
    common_languages_why?: string
  }
  panel_heads_up?: string
}

type DemographicsDatasetFile = {
  metadata: {
    last_updated: string
    religion_source: string
    demographics_source: string
    disclaimer: string
  }
  countries: Record<string, DemographicsCountryData>
}

const dataset = demographicsDataset as DemographicsDatasetFile

export const RELIGION_BAR_ORDER: ReligionKey[] = [
  'Christian',
  'Muslim',
  'Buddhist',
  'Hindu',
  'Jewish',
  'Unaffiliated',
  'Other',
]

export const DEMOGRAPHICS_UNAVAILABLE_MESSAGE =
  'People and culture data not yet available for this country.'

export function demographicsCityUnavailableTitle(): string {
  return 'Demographic data not available'
}

export function demographicsCityUnavailableBody(city: string): string {
  const place = city.trim() || 'this city'
  return `We don't yet have reliable population, urbanization, or age data for ${place} specifically. This is more common for smaller or less-studied cities — we're expanding coverage over time.`
}

export function demographicsCountryFallbackLabel(country: string): string {
  return `See ${country.trim()} country-level estimate →`
}

export function religionCityUnavailableTitle(): string {
  return 'Religious affiliation data not available'
}

export function religionCityUnavailableBody(city: string): string {
  const place = city.trim() || 'this city'
  return `Our source for this (Pew Research) doesn't publish city-level breakdowns for ${place}. We'll add it if a reliable dataset becomes available.`
}

/** Helper under Demographics / Religion section titles (country-level Pew & World Bank data). */
export function peopleCultureCountryScopeHelper(country: string): string {
  const name = country.trim()
  return name ? `Country-level data · ${name}` : 'Country-level data'
}

export const DEMOGRAPHICS_TAB_SOURCE_FOOTER =
  'Religion: Pew Research Center 2020. Demographics: World Bank / UN 2024.'

export function defaultDemographicsPanelHeadsUp(): string {
  return 'This is country-level data — your city or neighborhood may feel very different. Religion and language snapshots do not capture block-by-block diversity.'
}

export function getDemographicsPanelHeadsUp(data: DemographicsCountryData | null): string {
  if (data?.panel_heads_up?.trim()) return data.panel_heads_up.trim()
  return defaultDemographicsPanelHeadsUp()
}

/** Warm retiree-focused note for median age row. */
export function medianAgeWhy(age: number): string {
  if (age < 35) {
    return "You'll be among a younger, working-age population — vibrant cities, but fewer retirees your age in daily life."
  }
  if (age <= 50) {
    return 'A mixed-age population — enough peers near retirement age in many cities without feeling like a retiree-only town.'
  }
  return 'An older national median often means more retirees nearby — easier to find social circles in your age bracket.'
}

const LEGEND_MIN_PCT = 1

/** Country-level people & culture data (keys match `city.country`, e.g. "Portugal"). */
export function getDemographicsData(country: string): DemographicsCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset.countries[trimmed] ?? null
}

export function hasCountryPeopleCultureData(country: string): boolean {
  return getDemographicsData(country) != null
}

export function getReligionBarSegments(
  breakdown: ReligionBreakdown,
): { key: ReligionKey; pct: number }[] {
  return RELIGION_BAR_ORDER.map((key) => ({
    key,
    pct: breakdown[key] ?? 0,
  })).filter((seg) => seg.pct > 0)
}

export function getReligionLegendItems(
  breakdown: ReligionBreakdown,
): { key: ReligionKey; pct: number }[] {
  return getReligionBarSegments(breakdown).filter((seg) => seg.pct > LEGEND_MIN_PCT)
}

export function getReligionBreakdownPct(
  data: DemographicsCountryData | null,
  key: ReligionKey,
): number | null {
  if (!data) return null
  const pct = data.religion.breakdown[key]
  return pct != null ? pct : null
}

/** Comparison table cell text. */
export function getDemographicsRowValue(
  data: DemographicsCountryData | null,
  rowId: string,
): string {
  if (!data) return '—'
  switch (rowId) {
    case 'demoDominantReligion':
      return data.religion.dominant
    case 'demoChristianPct':
      return formatPct(data.religion.breakdown.Christian)
    case 'demoMuslimPct':
      return formatPct(data.religion.breakdown.Muslim)
    case 'demoUnaffiliatedPct':
      return formatPct(data.religion.breakdown.Unaffiliated)
    case 'demoEnglish':
      return '—'
    case 'demoMedianAge':
      return `${data.demographics.median_age}`
    case 'demoUrbanPct':
      return `${data.demographics.urban_pct}%`
    case 'demoExpatCommunity':
      return data.demographics.expat_population
    default:
      return '—'
  }
}

export function getDemographicsRowNumericValue(
  data: DemographicsCountryData | null,
  rowId: string,
): number | null {
  if (!data) return null
  switch (rowId) {
    case 'demoChristianPct':
      return getReligionBreakdownPct(data, 'Christian')
    case 'demoMuslimPct':
      return getReligionBreakdownPct(data, 'Muslim')
    case 'demoUnaffiliatedPct':
      return getReligionBreakdownPct(data, 'Unaffiliated')
    case 'demoMedianAge':
      return data.demographics.median_age
    case 'demoUrbanPct':
      return data.demographics.urban_pct
    case 'demoEnglish':
      return null
    default:
      return null
  }
}

function formatPct(value: number | undefined): string {
  if (value == null) return '—'
  return `${value}%`
}

/** Parse compact figures like `47.4M`, `850K`, or plain numbers for count-up animation. */
export function parseCompactDemographicNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, '')
  const match = trimmed.match(/^([\d.]+)\s*([KMB])?$/i)
  if (!match) return null

  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value)) return null

  const suffix = (match[2] ?? '').toUpperCase()
  const multiplier =
    suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1

  return value * multiplier
}

/** Format an animated scalar using the suffix/precision from the source label. */
export function formatCompactDemographicNumber(value: number, template: string): string {
  if (value <= 0) {
    const trimmed = template.trim()
    const match = trimmed.match(/^[\d,]+(?:\.\d+)?\s*([KMB])?$/i)
    const suffix = (match?.[1] ?? '').toUpperCase()
    if (/\.\d/.test(trimmed) && suffix) return `0.0${suffix}`
    if (suffix) return `0${suffix}`
    return '0'
  }

  const trimmed = template.trim()
  const match = trimmed.match(/^[\d,]+(?:\.\d+)?\s*([KMB])?$/i)
  const suffix = (match?.[1] ?? '').toUpperCase()
  const multiplier =
    suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : suffix === 'K' ? 1_000 : 1
  const scaled = value / multiplier
  const decimalPlaces = /\.\d/.test(trimmed) ? 1 : 0

  return `${scaled.toFixed(decimalPlaces)}${suffix}`
}
