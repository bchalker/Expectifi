import gettingThereDataset from '../data/getting-there.json'

export type GettingThereAirport = {
  code: string
  name: string
  city: string
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
  'Flight data is approximate. Routes and availability change seasonally. Verify current routes before planning.'

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
  return `https://www.google.com/flights?q=${query}`
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

export function formatAirlinesList(airlines: string[]): string {
  return airlines.join(', ')
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
