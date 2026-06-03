/** Toolbar preset for map geography (country allowlists). */
export type MapWhereToLook =
  | 'all'
  | 'us'
  | 'europe'
  | 'latin-america'
  | 'southeast-asia'
  | 'middle-east'

export const MAP_WHERE_TO_LOOK_OPTIONS: { id: MapWhereToLook; label: string }[] = [
  { id: 'all', label: 'All destinations' },
  { id: 'us', label: 'United States only' },
  { id: 'europe', label: 'Europe' },
  { id: 'latin-america', label: 'Latin America' },
  { id: 'southeast-asia', label: 'Southeast Asia' },
  { id: 'middle-east', label: 'Middle East' },
]

const US_ONLY = new Set(['United States'])

const EUROPE = new Set([
  'Portugal', 'Spain', 'Italy', 'France', 'Greece', 'Croatia',
  'Hungary', 'Czech Republic', 'Poland', 'Romania', 'Bulgaria',
  'Serbia', 'Montenegro', 'Albania', 'North Macedonia', 'Slovakia',
  'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Moldova', 'Georgia',
  'Armenia', 'Turkey', 'Germany', 'Austria', 'Switzerland', 'Netherlands',
  'Belgium', 'Denmark', 'Sweden', 'Norway', 'Finland', 'Iceland',
  'Ireland', 'United Kingdom', 'Luxembourg', 'Malta', 'Cyprus',
  'Gibraltar', 'Kosovo', 'Bosnia And Herzegovina',
])

const LATIN_AMERICA = new Set([
  'Mexico', 'Colombia', 'Panama', 'Costa Rica', 'Ecuador', 'Peru',
  'Uruguay', 'Argentina', 'Brazil', 'Chile', 'Dominican Republic',
  'Belize', 'Guatemala', 'Honduras', 'Bolivia', 'Paraguay', 'Nicaragua',
  'Venezuela', 'Guyana', 'Trinidad And Tobago', 'Jamaica', 'Barbados',
  'Bahamas', 'Curacao',
])

const SOUTHEAST_ASIA = new Set([
  'Thailand', 'Malaysia', 'Vietnam', 'Philippines', 'Indonesia',
  'Cambodia', 'Singapore', 'Taiwan', 'South Korea', 'Japan', 'Hong Kong',
  'India', 'Sri Lanka', 'Nepal', 'Bhutan', 'Bangladesh', 'Myanmar',
])

const MIDDLE_EAST = new Set([
  'United Arab Emirates', 'Bahrain', 'Qatar', 'Kuwait', 'Jordan',
  'Israel', 'Lebanon', 'Saudi Arabia', 'Egypt', 'Morocco', 'Tunisia',
  'Algeria',
])

const WHERE_TO_LOOK_COUNTRY_SETS: Record<
  Exclude<MapWhereToLook, 'all'>,
  ReadonlySet<string>
> = {
  us: US_ONLY,
  europe: EUROPE,
  'latin-america': LATIN_AMERICA,
  'southeast-asia': SOUTHEAST_ASIA,
  'middle-east': MIDDLE_EAST,
}

export function whereToLookCountrySet(
  choice: MapWhereToLook,
): ReadonlySet<string> | null {
  if (choice === 'all') return null
  return WHERE_TO_LOOK_COUNTRY_SETS[choice]
}

export function passesWhereToLookCountry(
  country: string,
  choice: MapWhereToLook,
): boolean {
  const set = whereToLookCountrySet(choice)
  if (!set) return true
  return set.has(country)
}
