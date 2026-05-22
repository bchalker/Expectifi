import type { DestinationRegion } from './whereToRetire/cityMapScoring'

/** ISO-based geography buckets for retirement destination filtering. */
export type IsoRegionBucket = 'europe' | 'latin-america' | 'southeast-asia' | 'other'

const EUROPE = new Set([
  'PT', 'ES', 'IT', 'GR', 'FR', 'DE', 'NL', 'BE', 'IE', 'GB', 'AT', 'CH', 'LU', 'IS',
  'DK', 'SE', 'NO', 'FI', 'PL', 'HR', 'SK', 'SI', 'LV', 'LT', 'EE', 'HU', 'CZ', 'RO',
  'BG', 'RS', 'ME', 'AL', 'BA', 'MK', 'XK', 'MT', 'CY', 'TR', 'GE',
])

const LATIN_AMERICA = new Set([
  'MX', 'CO', 'PA', 'CR', 'EC', 'UY', 'CL', 'AR', 'BR', 'PE', 'DO', 'JM', 'BB', 'BZ',
  'GY', 'TT', 'NI', 'HN', 'GT', 'BO', 'PY', 'VE', 'CU',
])

const SOUTHEAST_ASIA = new Set([
  'TH', 'MY', 'VN', 'PH', 'ID', 'KH', 'SG', 'MM', 'LA', 'BN', 'JP', 'KR', 'TW', 'HK',
  'IN', 'LK', 'NP', 'BD',
])

const EASTERN_EUROPE_ISO = new Set([
  'UA', 'MD', 'BY', 'RU', 'KZ', 'UZ', 'AZ', 'AM',
])

const MIDDLE_EAST_AFRICA_ISO = new Set([
  'MA', 'EG', 'JO', 'AE', 'OM', 'BH', 'QA', 'KW', 'IL', 'LB', 'SA', 'DZ', 'TN', 'ZA',
  'KE', 'NG', 'GH', 'ET', 'MU', 'CV', 'SN',
])

export function getFlagEmoji(iso: string): string {
  const code = iso.toUpperCase()
  if (code.length !== 2) return ''
  return [...code]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

export function getRegion(iso: string): IsoRegionBucket {
  const code = iso.toUpperCase()
  if (EUROPE.has(code)) return 'europe'
  if (LATIN_AMERICA.has(code)) return 'latin-america'
  if (SOUTHEAST_ASIA.has(code)) return 'southeast-asia'
  return 'other'
}

/** Map ISO bucket to map filter region keys (5-region model). */
export function isoRegionToDestinationRegion(iso: string): DestinationRegion | null {
  const bucket = getRegion(iso)
  if (bucket === 'europe') return 'europe'
  if (bucket === 'latin-america') return 'latin-america'
  if (bucket === 'southeast-asia') return 'southeast-asia'
  const code = iso.toUpperCase()
  if (EASTERN_EUROPE_ISO.has(code)) return 'eastern-europe'
  if (MIDDLE_EAST_AFRICA_ISO.has(code)) return 'middle-east-africa'
  if (bucket === 'other') return 'middle-east-africa'
  return null
}
