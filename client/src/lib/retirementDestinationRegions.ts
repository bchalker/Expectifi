import { whereToLookCountrySet } from './whereToRetire/whereToLookCountries'

export type FitRegionFilter = 'europe' | 'latin-america' | 'southeast-asia' | 'other'

export const FIT_REGION_OPTIONS: { id: FitRegionFilter; label: string }[] = [
  { id: 'europe', label: 'Europe' },
  { id: 'latin-america', label: 'Latin America' },
  { id: 'southeast-asia', label: 'Southeast Asia' },
  { id: 'other', label: 'Other' },
]

const EUROPE = whereToLookCountrySet('europe')!
const LATIN = whereToLookCountrySet('latin-america')!
const SEA = whereToLookCountrySet('southeast-asia')!

export function countryMatchesFitRegion(
  country: string,
  selected: ReadonlySet<FitRegionFilter>,
): boolean {
  if (selected.size === 0 || selected.size === FIT_REGION_OPTIONS.length) return true
  const inEurope = EUROPE.has(country)
  const inLatin = LATIN.has(country)
  const inSea = SEA.has(country)
  const inOther = !inEurope && !inLatin && !inSea && country !== 'United States'

  for (const region of selected) {
    if (region === 'europe' && inEurope) return true
    if (region === 'latin-america' && inLatin) return true
    if (region === 'southeast-asia' && inSea) return true
    if (region === 'other' && inOther) return true
  }
  return false
}
