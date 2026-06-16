import expatInfoDataset from '../data/expat-info.json'

export type ExpatCommunitySizeTone = 'green' | 'teal' | 'amber' | 'muted'

export type ExpatCommunityPinTier =
  | 'enormous'
  | 'very-large'
  | 'large'
  | 'moderate'
  | 'small'
  | 'domestic'
  | 'none'

export const DOMESTIC_RETIREMENT_COUNTRY = 'United States'

/** US cities in the map are domestic retirement, not expat destinations. */
export function isDomesticRetirementDestination(country: string): boolean {
  return country.trim() === DOMESTIC_RETIREMENT_COUNTRY
}

export type ExpatCountryData = {
  community_size: string
  estimated_americans: string
  popular_areas: string[]
  expat_vibe: string
  facebook_groups: string[]
  forums: string[]
  internations_chapter: boolean
  cost_note: string
  language_barrier: string
  healthcare_expat: string
  community_why?: string
  expat_vibe_why?: string
  language_barrier_why?: string
  healthcare_expat_why?: string
  cost_note_why?: string
  panel_heads_up?: string
}

type ExpatInfoDatasetFile = {
  metadata: {
    last_updated: string
    disclaimer: string
    sources: string[]
  }
  countries: Record<string, ExpatCountryData>
}

const dataset = expatInfoDataset as ExpatInfoDatasetFile

export const EXPAT_TAB_SOURCE_FOOTER =
  'Sources: InterNations Expat Insider 2024, Expat.com, community reports. Conditions change so always verify.'

export const EXPAT_UNAVAILABLE_MESSAGE =
  'Expat community data not yet available for this destination. Try searching expat groups on Facebook for current community information.'

export function defaultExpatPanelHeadsUp(): string {
  return 'Community size, costs, and group activity change quickly — check recent forum posts and talk to people on the ground before you sign a lease or sell your home.'
}

export function getExpatPanelHeadsUp(data: ExpatCountryData | null): string {
  if (data?.panel_heads_up?.trim()) return data.panel_heads_up.trim()
  return defaultExpatPanelHeadsUp()
}

/** Country-level expat data (keys match `city.country`, e.g. "Portugal"). */
export function getExpatInfo(country: string): ExpatCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset.countries[trimmed] ?? null
}

/** Expat-relocation context; excludes US domestic retirement. */
export function getExpatDestinationInfo(country: string): ExpatCountryData | null {
  if (isDomesticRetirementDestination(country)) return null
  return getExpatInfo(country)
}

function normalizeCommunitySize(size: string): string {
  return size.trim().toLowerCase()
}

/** UI badge tone for community size row in Expat Life tab. */
export function expatCommunitySizeTone(size: string): ExpatCommunitySizeTone {
  const n = normalizeCommunitySize(size)
  if (n === 'enormous' || n === 'very large' || n.startsWith('very large')) {
    return 'green'
  }
  if (
    n === 'large' ||
    n === 'large relative to population' ||
    n.startsWith('large relative')
  ) {
    return 'teal'
  }
  if (n === 'moderate' || n === 'large and rapidly growing') {
    return 'amber'
  }
  return 'muted'
}

/** Map pin / list card tier from community_size string. */
export function expatCommunityPinTier(country: string): ExpatCommunityPinTier {
  if (isDomesticRetirementDestination(country)) return 'domestic'
  const data = getExpatInfo(country)
  if (!data) return 'none'
  const n = normalizeCommunitySize(data.community_size)
  if (n === 'enormous') return 'enormous'
  if (n === 'very large' || n.startsWith('very large')) return 'very-large'
  if (
    n === 'large' ||
    n === 'large relative to population' ||
    n === 'large and rapidly growing' ||
    n.startsWith('large relative')
  ) {
    return 'large'
  }
  if (n === 'moderate') return 'moderate'
  if (n === 'small but growing') return 'small'
  return 'moderate'
}

const PIN_COLORS: Record<ExpatCommunityPinTier, string> = {
  enormous: '#22c55e',
  'very-large': '#0d9488',
  large: '#3b82f6',
  moderate: '#f59e0b',
  small: '#94a3b8',
  domestic: '#94a3b8',
  none: '#e2e8f0',
}

const PIN_LABELS: Record<ExpatCommunityPinTier, string> = {
  enormous: 'Enormous community',
  'very-large': 'Very large',
  large: 'Large',
  moderate: 'Moderate',
  small: 'Small',
  domestic: 'Domestic',
  none: 'No data',
}

/** Sort rank for expat view (higher = larger community, sorts first). */
const PIN_SORT_RANK: Record<ExpatCommunityPinTier, number> = {
  enormous: 6,
  'very-large': 5,
  large: 4,
  moderate: 3,
  small: 2,
  domestic: -1,
  none: 0,
}

export function expatCommunityPinColor(country: string): string {
  return PIN_COLORS[expatCommunityPinTier(country)]
}

export function expatCommunityPinLabel(country: string): string {
  if (isDomesticRetirementDestination(country)) return PIN_LABELS.domestic
  const data = getExpatInfo(country)
  if (!data) return PIN_LABELS.none
  return data.community_size
}

export function expatCommunitySortRank(country: string): number {
  return PIN_SORT_RANK[expatCommunityPinTier(country)]
}

export function formatEstimatedAmericans(estimate: string): string {
  const trimmed = estimate.trim()
  if (!trimmed) return ''
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (!digits) return trimmed
  const formatted = Number(digits).toLocaleString('en-US')
  return `~${formatted} Americans`
}

export function facebookGroupSearchUrl(groupName: string): string {
  return `https://www.facebook.com/search/groups/?q=${encodeURIComponent(groupName)}`
}

export function forumLinkHref(forum: string): string {
  const trimmed = forum.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('r/')) return `https://www.reddit.com/${trimmed}`
  const domain = trimmed.split(/\s/)[0]?.replace(/[(),]/g, '') ?? trimmed
  if (domain.includes('.')) {
    return domain.startsWith('www.') ? `https://${domain}` : `https://${domain}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

export function expatUnavailableMessage(cityName: string): string {
  const city = cityName.trim()
  if (!city) return EXPAT_UNAVAILABLE_MESSAGE
  return `Expat community data not yet available for this destination. Try searching '${city} expats' on Facebook for current community groups.`
}
