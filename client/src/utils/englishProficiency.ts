import englishProficiencyDataset from '../data/english-proficiency.json'

export type EnglishProficiencyLevel =
  | 'native'
  | 'very_high'
  | 'high'
  | 'moderate_high'
  | 'moderate'
  | 'low_moderate'
  | 'low'

export type EnglishProficiencyTone = 'green' | 'teal' | 'amber' | 'muted'

const PROFICIENCY_ORDER: EnglishProficiencyLevel[] = [
  'native',
  'very_high',
  'high',
  'moderate_high',
  'moderate',
  'low_moderate',
  'low',
]

/** Map filter bar English proficiency threshold. */
export type EnglishProficiencyFilter =
  | 'any'
  | 'english-only'
  | 'mostly-english'
  | 'some-english'

const MAP_FILTER_LEVELS: Record<
  Exclude<EnglishProficiencyFilter, 'any'>,
  ReadonlySet<EnglishProficiencyLevel>
> = {
  'english-only': new Set(['native', 'very_high']),
  'mostly-english': new Set(['native', 'very_high', 'high', 'moderate_high']),
  'some-english': new Set(['native', 'very_high', 'high', 'moderate_high', 'moderate']),
}

type EnglishProficiencyDatasetFile = {
  metadata: {
    last_updated: string
    scale: string
    source: string
    filter_threshold: string
  }
  countries: Record<string, EnglishProficiencyLevel>
}

const dataset = englishProficiencyDataset as EnglishProficiencyDatasetFile
const countries = dataset.countries

/** `metadata.last_updated` from english-proficiency.json (`YYYY-MM`). */
export function getEnglishProficiencyLastUpdated(): string {
  return dataset.metadata.last_updated
}

/** Country-level English proficiency (keys match `city.country`, e.g. "Portugal"). */
export function getEnglishProficiency(country: string): EnglishProficiencyLevel | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return countries[trimmed] ?? null
}

export function passesEnglishProficiencyMapFilter(
  country: string,
  filter: EnglishProficiencyFilter,
): boolean {
  if (filter === 'any') return true
  const level = getEnglishProficiency(country)
  if (!level) return false
  return MAP_FILTER_LEVELS[filter].has(level)
}

export function getEnglishProficiencyTone(level: EnglishProficiencyLevel): EnglishProficiencyTone {
  if (level === 'native' || level === 'very_high') return 'green'
  if (level === 'high' || level === 'moderate_high') return 'teal'
  if (level === 'moderate') return 'amber'
  return 'muted'
}

export function getEnglishProficiencyBadgeLabel(level: EnglishProficiencyLevel): string {
  if (level === 'native' || level === 'very_high') return 'English widely spoken'
  if (level === 'high' || level === 'moderate_high') return 'Good English availability'
  if (level === 'moderate') return 'Some English spoken'
  return 'Limited English'
}

/** Retiree-focused guidance for the English proficiency badge. */
export function getEnglishProficiencyWhy(level: EnglishProficiencyLevel): string {
  if (level === 'native' || level === 'very_high') {
    return 'Daily errands, healthcare intake, and making friends are much easier when English is common — you can lean on it while you learn the local language.'
  }
  if (level === 'high' || level === 'moderate_high') {
    return 'Major cities and expat neighborhoods usually work in English — outside those bubbles, basic local language still pays off fast.'
  }
  if (level === 'moderate') {
    return 'Plan for a learning curve on banking, contracts, and friendships — English works in tourist zones, not everywhere you will live.'
  }
  return 'Assume you will need local language or a translator for daily life — pick a city with a strong expat infrastructure if that is not your plan.'
}

/** Numeric rank for comparison highlighting (higher = better English). */
export function getEnglishProficiencyRank(level: EnglishProficiencyLevel): number {
  const index = PROFICIENCY_ORDER.indexOf(level)
  return index >= 0 ? PROFICIENCY_ORDER.length - index : 0
}

export function getEnglishProficiencyRankForCountry(country: string): number | null {
  const level = getEnglishProficiency(country)
  return level ? getEnglishProficiencyRank(level) : null
}

export function getEnglishProficiencyDisplayValue(country: string): string {
  const level = getEnglishProficiency(country)
  if (!level) return '—'
  return getEnglishProficiencyBadgeLabel(level)
}

/** Practical “English friendliness” score (0–100) for comparison table gauge row. */
export function englishFriendlinessScoreForCountry(country: string): number {
  const level = getEnglishProficiency(country)
  if (!level) return 48
  switch (level) {
    case 'native':
    case 'very_high':
      return 90
    case 'high':
    case 'moderate_high':
      return 78
    case 'moderate':
      return 62
    case 'low_moderate':
      return 52
    case 'low':
      return 38
    default:
      return 48
  }
}
