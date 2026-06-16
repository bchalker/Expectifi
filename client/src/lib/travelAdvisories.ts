import travelAdvisoriesData from '../data/travel-advisories.generated.json'

export type TravelAdvisoryEntry = {
  country: string
  feedCountry: string
  level: 3 | 4
  levelLabel: string
  pubDate: string
  title: string
}

type TravelAdvisoriesFile = {
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

export function formatTravelAdvisorySummary(entry: TravelAdvisoryEntry): string {
  return `Level ${entry.level}: ${entry.levelLabel}. Last reviewed ${entry.pubDate}.`
}
