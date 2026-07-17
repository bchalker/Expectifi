import {
  getEffectiveTaxRate,
  taxBadgeLabel,
  taxBadgeTone,
} from '../retirementFormulas'
import { PORTUGAL_TAX_DISCLOSURE_SHORT } from '../calc/portugalTax'
import { FRANCE_TAX_DISCLOSURE_SHORT } from '../calc/franceTax'
import { NETHERLANDS_TAX_DISCLOSURE_SHORT } from '../calc/netherlandsTax'
import {
  ITALY_ART_24_TER_DISCLOSURE_SHORT,
  ITALY_TAX_DISCLOSURE_SHORT,
  isItalyArt24TerEligibleCity,
} from '../calc/italyTax'
import type { FavoriteCityEntry } from '../retirementStorage'
import { calcMapIncomeFit } from './mapIncomeFit'
import { resolveMapLifestyle, type MapFilters } from './cityMapScoring'
import { lookupRetirementCity } from './retirementCityLookup'
import {
  calculateMonthlyBudget,
  countryToIsoCode,
  formatUsd,
  getAllMapCities,
  type MapCity,
} from '../../utils/costOfLiving'

export type FavoriteMapRow = {
  entry: FavoriteCityEntry
  iso: string
  label: string
  surplus: number
  taxLabel: string
  taxTone: 'green' | 'amber' | 'red'
  taxTooltip?: string
}

function cityCountryKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
}

let mapCityByKey: Map<string, MapCity> | null = null

function lookupMapCity(city: string, country: string): MapCity | null {
  if (!mapCityByKey) {
    mapCityByKey = new Map()
    for (const c of getAllMapCities()) {
      mapCityByKey.set(cityCountryKey(c.city, c.country), c)
    }
  }
  return mapCityByKey.get(cityCountryKey(city, country)) ?? null
}

function resolveFavoriteIso(
  entry: FavoriteCityEntry,
  recordIso?: string,
): string {
  if (entry.country_iso) return entry.country_iso
  if (recordIso) return recordIso
  return countryToIsoCode(entry.country) ?? ''
}

function favoriteSurplusAndTax(
  entry: FavoriteCityEntry,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'lifestyle'>,
  modeledAge?: number,
): { surplus: number; taxRate: number } {
  const mapCity = lookupMapCity(entry.city, entry.country)
  const record = lookupRetirementCity(entry.city, entry.country)
  if (record && mapCity) {
    const fit = calcMapIncomeFit(
      mapCity,
      record,
      monthlyIncome,
      filters,
      modeledAge,
    )
    return { surplus: fit.surplus, taxRate: fit.taxRate }
  }

  const iso = resolveFavoriteIso(entry)
  const taxRate = getEffectiveTaxRate(
    iso,
    monthlyIncome * 12,
    undefined,
    modeledAge,
    entry.city,
  )
  if (!mapCity) {
    return { surplus: 0, taxRate }
  }

  const lifestyle = resolveMapLifestyle(filters)
  const budget = calculateMonthlyBudget(mapCity, lifestyle).total
  const netIncome = monthlyIncome * (1 - taxRate)
  return { surplus: netIncome - budget, taxRate }
}

export function buildFavoriteMapRows(
  favorites: FavoriteCityEntry[],
  monthlyIncome: number,
  filters: Pick<MapFilters, 'lifestyle'>,
  modeledAge?: number,
): FavoriteMapRow[] {
  const rows: FavoriteMapRow[] = []

  for (const entry of favorites) {
    const record = lookupRetirementCity(entry.city, entry.country)
    const iso = resolveFavoriteIso(entry, record?.country_iso)
    const { surplus, taxRate } = favoriteSurplusAndTax(
      entry,
      monthlyIncome,
      filters,
      modeledAge,
    )

    rows.push({
      entry,
      iso,
      label: `${entry.city}, ${entry.country}`,
      surplus,
      taxLabel: taxBadgeLabel(taxRate, iso, entry.city),
      taxTone: taxBadgeTone(taxRate, iso, entry.city),
      taxTooltip:
        iso === 'PT' || entry.country.trim() === 'Portugal'
          ? PORTUGAL_TAX_DISCLOSURE_SHORT
          : iso === 'IT' || entry.country.trim() === 'Italy'
            ? isItalyArt24TerEligibleCity(entry.city)
              ? ITALY_ART_24_TER_DISCLOSURE_SHORT
              : ITALY_TAX_DISCLOSURE_SHORT
            : iso === 'FR' || entry.country.trim() === 'France'
              ? FRANCE_TAX_DISCLOSURE_SHORT
              : iso === 'NL' || entry.country.trim() === 'Netherlands'
                ? NETHERLANDS_TAX_DISCLOSURE_SHORT
                : undefined,
    })
  }

  return rows.sort((a, b) => b.surplus - a.surplus)
}

export function formatFavoriteSurplus(surplus: number): string {
  const sign = surplus >= 0 ? '+' : '−'
  return `${sign}${formatUsd(Math.abs(surplus))}`
}
