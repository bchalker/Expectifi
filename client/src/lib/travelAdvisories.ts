import travelAdvisoriesData from '../data/travel-advisories.generated.json'

export type TravelAdvisoryEntry = {
  country: string
  feedCountry: string
  level: 3 | 4
  levelLabel: string
  pubDate: string
  title: string
}

export type TravelAdvisoriesMetadata = {
  sourceUrl: string
  /** ISO timestamp when the advisory feed was fetched. */
  fetchedAt: string
  feedPubDate: string
  catalogCountryCount: number
  level4MatchedCount: number
  level3MatchedCount: number
}

type TravelAdvisoriesFile = {
  metadata: TravelAdvisoriesMetadata
  level4: TravelAdvisoryEntry[]
  level3: TravelAdvisoryEntry[]
}

const data = travelAdvisoriesData as TravelAdvisoriesFile

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

const level4ByCountry = new Map(
  data.level4.map((entry) => [normalizeLookup(entry.country), entry]),
)
const level3ByCountry = new Map(
  data.level3.map((entry) => [normalizeLookup(entry.country), entry]),
)

const doNotTravelCountries = data.level4.map((entry) => entry.country)

/** Level 4 — default-exclude and “Hide unsafe cities” filter. */
export function getDoNotTravelAdvisoryCountries(): readonly string[] {
  return doNotTravelCountries
}

export function getDoNotTravelAdvisory(country: string): TravelAdvisoryEntry | null {
  return level4ByCountry.get(normalizeLookup(country)) ?? null
}

export function hasDoNotTravelAdvisory(country: string): boolean {
  return level4ByCountry.has(normalizeLookup(country))
}

/** Level 3 — informational caution chips only. */
export function getReconsiderTravelAdvisory(country: string): TravelAdvisoryEntry | null {
  return level3ByCountry.get(normalizeLookup(country)) ?? null
}

export function hasReconsiderTravelAdvisory(country: string): boolean {
  return level3ByCountry.has(normalizeLookup(country))
}

export function getTravelAdvisoriesFetchedAt(): string {
  return data.metadata.fetchedAt
}

/** Calendar date for chip copy, e.g. `Jun 16, 2026`. */
export function formatTravelAdvisoriesAsOfDate(
  fetchedAt: string = data.metadata.fetchedAt,
): string {
  const ms = Date.parse(fetchedAt)
  if (!Number.isFinite(ms)) return fetchedAt
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ms))
}

export function travelAdvisoriesAsOfMessage(
  fetchedAt: string = data.metadata.fetchedAt,
): string {
  return `Advisory data as of ${formatTravelAdvisoriesAsOfDate(fetchedAt)}.`
}

export function formatTravelAdvisorySummary(entry: TravelAdvisoryEntry): string {
  return `Level ${entry.level}: ${entry.levelLabel}. Last reviewed ${entry.pubDate}.`
}
