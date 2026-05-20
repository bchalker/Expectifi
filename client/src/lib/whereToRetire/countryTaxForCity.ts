import { getCountryTaxEntry, type CountryTaxEntry } from '../../data/countryTaxRates'
import { countryToIsoCode } from '../../utils/costOfLiving'

export function getCountryTaxForCityCountry(countryName: string): CountryTaxEntry | null {
  const iso = countryToIsoCode(countryName)
  if (!iso) return null
  return getCountryTaxEntry(iso) ?? null
}
