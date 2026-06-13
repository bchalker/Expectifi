import gettingThereDataset from '../data/getting-there.json'
import { AIRPORT_COORDINATES } from '../data/airport-coordinates'
import { haversineMiles } from '../lib/calc/geo'

export type GettingThereAirport = {
  code: string
  name: string
  city: string
  official_url?: string
}

export type GettingThereCountryData = {
  main_airports: GettingThereAirport[]
  direct_from_us: boolean
  direct_from_uk: boolean
  direct_from_ca: boolean
  direct_from_au: boolean
  direct_us_cities: string[]
  flight_time_hours: { east_coast: number; west_coast: number }
  airlines: string[]
  best_booking_tip: string
  nearest_major_us_hub: string
  visa_free_days: number
  /** YYYY-MM stamp from scheduled Amadeus route refresh (optional). */
  _verified_at?: string
  /** Manual seasonal overrides merged by refresh script (optional). */
  keep_us_cities?: string[]
}

type GettingThereDatasetFile = {
  metadata: {
    last_updated: string
    disclaimer: string
    us_hub_note: string
  }
  countries: Record<string, GettingThereCountryData>
}

const dataset = gettingThereDataset as GettingThereDatasetFile

export const GETTING_THERE_UNAVAILABLE_MESSAGE =
  'Flight information not yet available for this country.'

export const GETTING_THERE_TAB_SOURCE_FOOTER =
  'Flight data is approximate and curated in-app (last updated May 2026). Distances are great-circle miles from US hubs to the primary destination airport (OurAirports). Routes and availability change seasonally — verify before planning.'

/** Country-level flight and entry data (keys match `city.country`, e.g. "Portugal"). */
export function getGettingThereData(country: string): GettingThereCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset.countries[trimmed] ?? null
}

export function getPrimaryAirportCode(data: GettingThereCountryData): string | null {
  const code = data.main_airports[0]?.code?.trim()
  if (!code || code.toLowerCase() === 'various') return null
  return code
}

export function googleFlightsSearchUrl(data: GettingThereCountryData): string {
  const code = getPrimaryAirportCode(data)
  const query = code ? `flights+to+${code}` : `flights+to+${encodeURIComponent(data.main_airports[0]?.city ?? '')}`
  return `https://www.google.com/travel/flights?q=${query}`
}

export function googleFlightsRouteSearchUrl(originIata: string, destinationIata: string): string {
  const origin = originIata.trim().toUpperCase()
  const destination = destinationIata.trim().toUpperCase()
  return `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${destination}`
}

/** "2026-06" → "Jun 2026" for verified-route captions. */
export function formatRoutesVerifiedCaption(stamp: string): string {
  const match = stamp.trim().match(/^(\d{4})-(\d{2})$/)
  if (!match) return stamp
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = parseInt(match[2], 10) - 1
  if (monthIndex < 0 || monthIndex > 11) return stamp
  return `${months[monthIndex]} ${match[1]}`
}

export function formatVisaFreeEntryNote(days: number): string {
  if (days >= 999) return 'US passport holders: No visa required — domestic destination'
  if (days >= 365) return 'US passport holders: Visa-free entry for up to 1 year'
  return `US passport holders: visa-free entry for ${days} days`
}

/** Sidebar list hint, e.g. "~7 hrs from East Coast". */
export function formatEastCoastFlightHint(country: string): string | null {
  const data = getGettingThereData(country)
  if (!data) return null
  const hours = data.flight_time_hours.east_coast
  if (hours <= 0) return null
  const label = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
  return `~${label} hrs from East Coast`
}

export function formatAirportOfficialUrl(airport: GettingThereAirport): string | null {
  const url = airport.official_url?.trim()
  return url || null
}

export function formatAirportOfficialHost(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host
  } catch {
    return url
  }
}

export function formatAirlinesList(airlines: string[]): string {
  return airlines.join(', ')
}

const US_DIRECT_HUB_IATA: Record<string, string> = {
  Atlanta: 'ATL',
  Boston: 'BOS',
  Charlotte: 'CLT',
  Chicago: 'ORD',
  'Chicago (seasonal)': 'ORD',
  Dallas: 'DFW',
  Denver: 'DEN',
  'Fort Lauderdale': 'FLL',
  Guam: 'GUM',
  Honolulu: 'HNL',
  Houston: 'IAH',
  'Los Angeles': 'LAX',
  Miami: 'MIA',
  Newark: 'EWR',
  Orlando: 'MCO',
  Philadelphia: 'PHL',
  'San Francisco': 'SFO',
  Seattle: 'SEA',
  'Washington DC': 'IAD',
  'Washington DC (seasonal)': 'IAD',
}

export type DirectUsCityDisplay = {
  city: string
  iata: string | null
}

/** City label for direct-US routes; appends hub IATA when missing from data. */
export function formatDirectUsCityDisplay(city: string): DirectUsCityDisplay {
  const trimmed = city.trim()
  if (/\([A-Z]{3}\)/.test(trimmed)) {
    return { city: trimmed, iata: null }
  }
  return { city: trimmed, iata: US_DIRECT_HUB_IATA[trimmed] ?? null }
}

export function getDirectUsHubIata(city: string): string | null {
  const trimmed = city.trim()
  const embedded = trimmed.match(/\(([A-Z]{3})\)/)
  if (embedded) return embedded[1]
  return US_DIRECT_HUB_IATA[trimmed] ?? null
}

export function getDirectUsCityDistanceMiles(
  usCity: string,
  destinationAirportCode: string | null,
): number | null {
  const hubCode = getDirectUsHubIata(usCity)
  if (!hubCode || !destinationAirportCode) return null
  const origin = AIRPORT_COORDINATES[hubCode]
  const destination = AIRPORT_COORDINATES[destinationAirportCode]
  if (!origin || !destination) return null
  return Math.round(haversineMiles(origin.lat, origin.lon, destination.lat, destination.lon))
}

export function formatFlightDistanceMiles(miles: number): string {
  return `${miles.toLocaleString('en-US')} mi`
}

/** Great-circle miles → approximate block time (~500 mph cruise + buffer). */
export function estimateFlightHoursFromDistanceMiles(distanceMiles: number): number {
  const hours = distanceMiles / 500 + 0.75
  return Math.round(hours * 2) / 2
}

export function formatEstimatedFlightHours(hours: number): string {
  const label = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
  return `~${label} hrs`
}

export function getDirectUsCityFlightHours(
  usCity: string,
  destinationAirportCode: string | null,
): number | null {
  const distanceMiles = getDirectUsCityDistanceMiles(usCity, destinationAirportCode)
  if (distanceMiles == null) return null
  return estimateFlightHoursFromDistanceMiles(distanceMiles)
}

export type ParsedAirlineRoute = {
  airline: string
  via?: string
}

/** Split "Malaysia Airlines via connection" or "American (via connection)" for stacked route UI. */
export function parseAirlineRoute(entry: string): ParsedAirlineRoute {
  const trimmed = entry.trim()
  const parenMatch = trimmed.match(/^(.+?)\s*\(via\s+(.+?)\)\s*$/i)
  if (parenMatch) {
    return { airline: parenMatch[1].trim(), via: parenMatch[2].trim() }
  }
  const viaMatch = trimmed.match(/^(.+?)\s+via\s+(.+)$/i)
  if (viaMatch) {
    return { airline: viaMatch[1].trim(), via: viaMatch[2].trim() }
  }
  return { airline: trimmed }
}

/** Comparison table display. */
export function getGettingThereRowValue(
  data: GettingThereCountryData | null,
  rowId: string,
): string {
  if (!data) return '—'
  switch (rowId) {
    case 'travelDirect':
      return data.direct_from_us ? 'Yes' : 'No'
    case 'travelEastCoast':
      return `${data.flight_time_hours.east_coast} hrs`
    case 'travelWestCoast':
      return `${data.flight_time_hours.west_coast} hrs`
    case 'travelVisaFree':
      if (data.visa_free_days >= 999) return 'Domestic'
      if (data.visa_free_days >= 365) return '365+'
      return `${data.visa_free_days}`
    case 'travelAirport':
      return getPrimaryAirportCode(data) ?? data.main_airports[0]?.code ?? '—'
    default:
      return '—'
  }
}

export function getGettingThereRowNumericValue(
  data: GettingThereCountryData | null,
  rowId: string,
): number | null {
  if (!data) return null
  switch (rowId) {
    case 'travelEastCoast':
      return data.flight_time_hours.east_coast
    case 'travelWestCoast':
      return data.flight_time_hours.west_coast
    case 'travelVisaFree':
      return data.visa_free_days >= 999 ? null : data.visa_free_days
    case 'travelDirect':
      return data.direct_from_us ? 1 : 0
    default:
      return null
  }
}
