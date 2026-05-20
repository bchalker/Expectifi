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
  }
  demographics: {
    population: string
    median_age: number
    urban_pct: number
    english_proficiency: string
    expat_population: string
    official_language: string
    common_languages: string
  }
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

export const DEMOGRAPHICS_TAB_SOURCE_FOOTER =
  'Religion: Pew Research Center 2020. Demographics: World Bank / UN 2024.'

const LEGEND_MIN_PCT = 1

/** Country-level people & culture data (keys match `city.country`, e.g. "Portugal"). */
export function getDemographicsData(country: string): DemographicsCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset.countries[trimmed] ?? null
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

export type EnglishProficiencyTone = 'green' | 'teal' | 'amber' | 'red'

export function getEnglishProficiencyTone(level: string): EnglishProficiencyTone {
  const normalized = level.trim().toLowerCase()
  if (normalized === 'very high' || normalized === 'native') return 'green'
  if (normalized === 'high' || normalized === 'moderate-high') return 'teal'
  if (normalized === 'moderate') return 'amber'
  return 'red'
}

/** Numeric rank for comparison highlighting (higher = better English). */
export function getEnglishProficiencyRank(level: string): number | null {
  const normalized = level.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'native' || normalized === 'very high') return 5
  if (normalized === 'high') return 4
  if (normalized === 'moderate-high') return 3.5
  if (normalized === 'moderate') return 3
  if (normalized === 'low-moderate') return 2
  if (normalized === 'low') return 1
  return null
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
      return data.demographics.english_proficiency
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
      return getEnglishProficiencyRank(data.demographics.english_proficiency)
    default:
      return null
  }
}

function formatPct(value: number | undefined): string {
  if (value == null) return '—'
  return `${value}%`
}
